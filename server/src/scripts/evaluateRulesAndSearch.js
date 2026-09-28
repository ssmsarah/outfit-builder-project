// I7.6: evaluation for the Rule-Based Matching and Fuzzy Search sprints.
// Runs entirely on in-memory fixtures (no DB), with one command:
//   npm run evaluate:rules-search
// and writes docs/algorithms/EVALUATION_RULES_SEARCH.md with 4 sections:
//   1. Search Precision@5, Recall@10, MRR by query type (S6.10 query set)
//   2. Ablation: word-only vs char-only vs combined (beta sweep), and
//      hybrid attribute matching (gamma sweep)
//   3. Rule impact: rejection rate per rule over candidate outfits, and
//      Precision@5 on the T4.4 labeled outfits with rules on vs off
//   4. Search latency (mean, p95)
//   5. Performance on a synthetic 1,000-item wardrobe (I7.7)
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { wardrobe, wardrobeById } from "../../tests/recommendation/fixtures/wardrobe.js";
import { labeledOutfits } from "../../tests/fixtures/labeled_outfits.js";
import { searchQueries } from "../../tests/fixtures/search_queries.js";
import { createSearchIndex, rankAll } from "../recommendation/search/searchIndex.js";
import { hybridSearch } from "../recommendation/search/hybridSearch.js";
import { outfitScore } from "../recommendation/compatibility/outfitScore.js";
import { evaluateOutfit } from "../recommendation/rules/ruleEngine.js";
import { rulesConfig } from "../config/rulesConfig.js";
import { searchConfig } from "../config/searchConfig.js";
import { OCCASIONS, SEASONS } from "../recommendation/itemEnums.js";
import { mean, clamp01 } from "../recommendation/utils/math.js";
import { runPerformanceChecks } from "./benchmarkRulesAndSearch.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const QUERY_GROUPS = {
  exact: ["exact"],
  typo: ["typo1", "typo2"],
  synonym: ["synonym"],
  multi_attribute: ["multi_attribute"],
};

// ---------------------------------------------------------------------
// Ranking metrics
// ---------------------------------------------------------------------

// Standard definitions. With one relevant item per query, P@5 can be at
// most 0.2, so the report also shows the best achievable value.
export function precisionAtK(rankedIds, relevant, k) {
  return rankedIds.slice(0, k).filter((id) => relevant.includes(id)).length / k;
}

export function recallAtK(rankedIds, relevant, k) {
  if (relevant.length === 0) return 0;
  return rankedIds.slice(0, k).filter((id) => relevant.includes(id)).length / relevant.length;
}

export function reciprocalRank(rankedIds, relevant) {
  const rank = rankedIds.findIndex((id) => relevant.includes(id));
  return rank === -1 ? 0 : 1 / (rank + 1);
}

// rank(query) -> ordered item ids. Returns metrics per group plus the
// no-match queries' empty-result rate.
export function evaluateRanker(rank, queries = searchQueries) {
  const groups = {};

  for (const [group, types] of Object.entries(QUERY_GROUPS)) {
    const rows = queries
      .filter((q) => types.includes(q.type))
      .map(({ query, relevant }) => {
        const ids = rank(query);
        return {
          query,
          p5: precisionAtK(ids, relevant, 5),
          maxP5: Math.min(relevant.length, 5) / 5,
          r10: recallAtK(ids, relevant, 10),
          rr: reciprocalRank(ids, relevant),
        };
      });

    groups[group] = {
      queries: rows.length,
      precisionAt5: mean(rows.map((r) => r.p5)),
      maxPrecisionAt5: mean(rows.map((r) => r.maxP5)),
      recallAt10: mean(rows.map((r) => r.r10)),
      mrr: mean(rows.map((r) => r.rr)),
      rows,
    };
  }

  const noMatch = queries.filter((q) => q.type === "no_match");
  const emptyRate = noMatch.length
    ? noMatch.filter(({ query }) => rank(query).length === 0).length / noMatch.length
    : 1;

  const scored = Object.values(groups).flatMap((g) => g.rows);
  const overall = {
    queries: scored.length,
    precisionAt5: mean(scored.map((r) => r.p5)),
    maxPrecisionAt5: mean(scored.map((r) => r.maxP5)),
    recallAt10: mean(scored.map((r) => r.r10)),
    mrr: mean(scored.map((r) => r.rr)),
  };

  return { groups, overall, noMatch: { queries: noMatch.length, emptyRate } };
}

// ---------------------------------------------------------------------
// 1 + 2. Search quality and ablation
// ---------------------------------------------------------------------
const TOP_K = 10;

export function runSearchEvaluation(index = createSearchIndex(wardrobe)) {
  const textRanker = (beta) => (query) => rankAll(index, query, { beta }).slice(0, TOP_K).map((r) => r.itemId);
  const hybridRanker = (gamma) => (query) =>
    hybridSearch(index, query, { gamma, limit: TOP_K }).results.map((r) => r.itemId);

  const main = evaluateRanker(hybridRanker(searchConfig.gamma));

  const betaSweep = [0, 0.3, searchConfig.beta, 1].map((beta) => ({
    beta,
    label: beta === 0 ? "word-only" : beta === 1 ? "char-only" : "combined",
    ...evaluateRanker(textRanker(beta)),
  }));

  const gammaSweep = [1, 0.8, searchConfig.gamma, 0.4, 0.2].map((gamma) => ({
    gamma,
    label: gamma === 1 ? "text only (no attribute match)" : "hybrid",
    ...evaluateRanker(hybridRanker(gamma)),
  }));

  return { main, betaSweep, gammaSweep };
}

// ---------------------------------------------------------------------
// 3. Rule impact
// ---------------------------------------------------------------------

// Every structurally valid top+bottom+shoes and dress+shoes outfit.
export function candidateOutfits(items = wardrobe) {
  const of = (category) => items.filter((i) => i.category === category);
  const outfits = [];
  for (const top of of("top")) for (const bottom of of("bottom")) for (const shoes of of("shoes")) outfits.push([top, bottom, shoes]);
  for (const dress of of("dress")) for (const shoes of of("shoes")) outfits.push([dress, shoes]);
  return outfits;
}

export const EVALUATION_CONTEXTS = [
  { label: "no context" },
  ...OCCASIONS.map((occasion) => ({ label: `occasion: ${occasion}`, occasion })),
  ...SEASONS.map((season) => ({ label: `season: ${season}`, season })),
];

export function runRuleImpact() {
  const outfits = candidateOutfits();
  const perRule = Object.fromEntries(rulesConfig.rules.map((r) => [r.id, { rejected: 0, softApplied: 0 }]));
  let evaluations = 0;
  let rejected = 0;

  for (const context of EVALUATION_CONTEXTS) {
    for (const outfit of outfits) {
      const result = evaluateOutfit(outfit, context);
      evaluations += 1;
      if (!result.allowed) rejected += 1;
      for (const entry of result.rejections) perRule[entry.ruleId].rejected += 1;
      for (const entry of result.allowed ? result.appliedRules : []) perRule[entry.ruleId].softApplied += 1;
    }
  }

  const rules = rulesConfig.rules.map((rule) => ({
    id: rule.id,
    type: rule.type,
    rejectedRate: perRule[rule.id].rejected / evaluations,
    appliedRate: perRule[rule.id].softApplied / evaluations,
  }));

  return { outfits: outfits.length, contexts: EVALUATION_CONTEXTS.length, evaluations, rejectedRate: rejected / evaluations, rules };
}

// T4.4's Precision@5 on the labeled outfits, with rules off (raw outfit
// score) and on (rejected outfits drop out, the rest use C_adjusted).
// Occasion-agnostic, like T4.4 (targetSeason: null).
export function runLabeledPrecision() {
  const context = { targetSeason: null };

  const score = (useRules) =>
    labeledOutfits
      .map((entry) => {
        const items = entry.ids.map((id) => wardrobeById[id]);
        const base = outfitScore(items, context);
        if (!useRules) return { ...entry, score: base, rejected: false };
        const rules = evaluateOutfit(items, context);
        return { ...entry, score: rules.allowed ? clamp01(base + rules.ruleAdjustment) : null, rejected: !rules.allowed };
      })
      .filter((o) => o.score !== null)
      .sort((a, b) => b.score - a.score || (a.ids.join() < b.ids.join() ? -1 : 1));

  const summarize = (ranked, all) => {
    const precision = (k) => ranked.slice(0, k).filter((o) => o.label === "good").length / k;
    return {
      precisionAt5: precision(5),
      precisionAt10: precision(10),
      kept: ranked.length,
      badRejected: all.filter((o) => o.rejected && o.label === "bad").length,
      goodRejected: all.filter((o) => o.rejected && o.label === "good").length,
    };
  };

  const off = score(false);
  const onAll = labeledOutfits.map((entry) => {
    const items = entry.ids.map((id) => wardrobeById[id]);
    return { ...entry, rejected: !evaluateOutfit(items, context).allowed };
  });
  const on = score(true);

  return {
    total: labeledOutfits.length,
    good: labeledOutfits.filter((o) => o.label === "good").length,
    rulesOff: summarize(off, off),
    rulesOn: summarize(on, onAll),
  };
}

// ---------------------------------------------------------------------
// 4. Latency
// ---------------------------------------------------------------------
export function runLatency({ repeats = 25 } = {}) {
  const index = createSearchIndex(wardrobe);
  const queries = searchQueries.map((q) => q.query);
  for (const q of queries) hybridSearch(index, q); // warm-up (caches, JIT)

  const times = [];
  for (let r = 0; r < repeats; r++) {
    for (const q of queries) {
      const start = performance.now();
      hybridSearch(index, q);
      times.push(performance.now() - start);
    }
  }
  times.sort((a, b) => a - b);

  return {
    samples: times.length,
    meanMs: mean(times),
    p95Ms: times[Math.floor(times.length * 0.95)],
    maxMs: times[times.length - 1],
  };
}

// ---------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const num = (x) => x.toFixed(3);

function metricsTable(title, rows) {
  return [
    `| ${title} | Queries | P@5 (max) | R@10 | MRR |`,
    "|---|---|---|---|---|",
    ...rows.map(([label, m]) => `| ${label} | ${m.queries} | ${num(m.precisionAt5)} (${num(m.maxPrecisionAt5)}) | ${num(m.recallAt10)} | ${num(m.mrr)} |`),
  ];
}

function sweepTable(param, sweep) {
  const groups = Object.keys(QUERY_GROUPS);
  return [
    `| ${param} | Variant | ${groups.map((g) => `MRR ${g}`).join(" | ")} | MRR overall | R@10 overall | No-match empty |`,
    `|---|---|${groups.map(() => "---").join("|")}|---|---|---|`,
    ...sweep.map((s) =>
      `| ${s[param]} | ${s.label} | ${groups.map((g) => num(s.groups[g].mrr)).join(" | ")} | ${num(s.overall.mrr)} | ${num(s.overall.recallAt10)} | ${pct(s.noMatch.emptyRate)} |`
    ),
  ];
}

export function buildReport() {
  const search = runSearchEvaluation();
  const impact = runRuleImpact();
  const labeled = runLabeledPrecision();
  const latency = runLatency();
  const performanceChecks = runPerformanceChecks();

  const wordOnly = search.betaSweep.find((s) => s.beta === 0);
  const combined = search.betaSweep.find((s) => s.beta === searchConfig.beta);
  const typoWins = combined.groups.typo.mrr > wordOnly.groups.typo.mrr;

  const lines = [];
  lines.push("# Rules and Search Evaluation", "");
  lines.push(`Generated by \`npm run evaluate:rules-search\` on ${new Date().toISOString()}.`, "");
  lines.push(
    `Uses the T0.4 fixture wardrobe (${wardrobe.length} items), the S6.10 query set ` +
      `(\`tests/fixtures/search_queries.js\`, ${searchQueries.length} queries with hand-judged relevance) and the ` +
      `T4.4 labeled outfits (\`tests/fixtures/labeled_outfits.js\`, ${labeled.total} outfits). ` +
      `Config: beta = ${searchConfig.beta}, gamma = ${searchConfig.gamma}, minScore = ${searchConfig.minScore}.`,
    ""
  );

  lines.push("## 1. Search quality (hybrid search, as served by the API)", "");
  lines.push(
    "P@5 is standard precision at 5, so a query with one relevant item can score at most 0.2; the best " +
      "achievable value is shown in brackets. R@10 is recall in the top 10. MRR is the mean reciprocal rank " +
      "of the first relevant item (0 when none is returned).",
    ""
  );
  lines.push(
    ...metricsTable("Query type", [
      ...Object.entries(search.main.groups).map(([g, m]) => [g, m]),
      ["**overall**", search.main.overall],
    ]),
    ""
  );
  lines.push(
    `No-match queries (${search.main.noMatch.queries}): ${pct(search.main.noMatch.emptyRate)} correctly returned no results.`,
    ""
  );

  const misses = Object.values(search.main.groups).flatMap((g) => g.rows).filter((r) => r.rr < 1);
  lines.push(
    misses.length
      ? `Queries whose first relevant item was not ranked first: ${misses.map((r) => `"${r.query}" (RR ${num(r.rr)})`).join(", ")}.`
      : "Every query ranked a relevant item first.",
    ""
  );

  lines.push("## 2. Ablation", "");
  lines.push(`### Text search: word-only vs char-only vs combined (beta sweep, SearchScore = beta * S_char + (1 - beta) * S_word)`, "");
  lines.push(...sweepTable("beta", search.betaSweep), "");
  lines.push(
    `Combined (beta = ${searchConfig.beta}) vs word-only on the typo group: MRR ${num(combined.groups.typo.mrr)} vs ` +
      `${num(wordOnly.groups.typo.mrr)} - ${typoWins ? "combined wins, as required" : "combined does NOT win"}.`,
    ""
  );
  lines.push(`### Hybrid attribute matching (gamma sweep, HybridScore = gamma * SearchScore + (1 - gamma) * MatchScore)`, "");
  lines.push(...sweepTable("gamma", search.gammaSweep), "");
  lines.push(
    "Every gamma gives the same ranking quality here: text search alone already ranks a relevant item first for " +
      "every query (MRR 1.0), so this query set is at its ceiling and cannot show what attribute matching adds to " +
      "ordering. Attribute matching still changes results through the category filter: the synonym query " +
      "\"denim\" is parsed as category *bottom* (denim -> jeans), so `denim_jacket` is filtered out at every " +
      "gamma, which is why synonym R@10 is 0.929. A one-word query naming a material, not a garment, is a " +
      "known weakness of the category filter.",
    ""
  );

  lines.push("## 3. Rule impact", "");
  lines.push(
    `Candidate outfits: every valid top+bottom+shoes and dress+shoes outfit from the fixture wardrobe ` +
      `(${impact.outfits}), each evaluated in ${impact.contexts} contexts (no context, each occasion, each season): ` +
      `${impact.evaluations} evaluations. Overall ${pct(impact.rejectedRate)} were rejected by at least one hard rule.`,
    ""
  );
  lines.push("| Rule | Type | Rejected (share of evaluations) | Applied as boost/penalty |", "|---|---|---|---|");
  for (const r of impact.rules) {
    lines.push(`| \`${r.id}\` | ${r.type} | ${r.type === "hard" ? pct(r.rejectedRate) : "-"} | ${r.type === "soft" ? pct(r.appliedRate) : "-"} |`);
  }
  lines.push("");
  lines.push(
    "Context-gated rules (e.g. `formal_no_sporty`) can only fire in their own context, so their overall share " +
      "is diluted across the other contexts. The season-only rules never fire here because no top, bottom, " +
      "shoes or dress in the fixture wardrobe is limited to a single season (the only winter-only item is an " +
      "outerwear coat, which is not part of these outfits); both rules are covered by the rule test suite.",
    ""
  );

  lines.push("### Labeled outfits: rules on vs off", "");
  lines.push("| Metric | Rules off | Rules on |", "|---|---|---|");
  lines.push(`| Precision@5 | ${pct(labeled.rulesOff.precisionAt5)} | ${pct(labeled.rulesOn.precisionAt5)} |`);
  lines.push(`| Precision@10 | ${pct(labeled.rulesOff.precisionAt10)} | ${pct(labeled.rulesOn.precisionAt10)} |`);
  lines.push(`| Outfits kept | ${labeled.rulesOff.kept} | ${labeled.rulesOn.kept} |`);
  lines.push(`| "Bad" outfits rejected by a hard rule | - | ${labeled.rulesOn.badRejected} of ${labeled.total - labeled.good} |`);
  lines.push(`| "Good" outfits rejected by a hard rule | - | ${labeled.rulesOn.goodRejected} of ${labeled.good} |`);
  lines.push("");
  lines.push(
    `Rules-on Precision@5 ${labeled.rulesOn.precisionAt5 >= labeled.rulesOff.precisionAt5 ? "is greater than or equal to" : "is LOWER than"} rules-off, as required.`,
    ""
  );

  lines.push("## 4. Search latency", "");
  lines.push("| Metric | Value |", "|---|---|");
  lines.push(`| Samples (${searchQueries.length} queries x repeats) | ${latency.samples} |`);
  lines.push(`| Mean | ${latency.meanMs.toFixed(3)} ms |`);
  lines.push(`| p95 | ${latency.p95Ms.toFixed(3)} ms |`);
  lines.push(`| Max | ${latency.maxMs.toFixed(3)} ms |`);
  lines.push("");
  lines.push("Hybrid search (parse + TF-IDF + attribute match) on the fixture index. The 1,000-item benchmark is I7.7.", "");

  lines.push("## 5. Performance on 1,000 items (I7.7)", "");
  lines.push(
    `Synthetic wardrobe of ${performanceChecks.size} items (the T4.5 generator, plus names built from each item's ` +
      "color, style and a garment word). Timings after a warm-up run.",
    ""
  );
  lines.push("| Operation | Mean | p95 | Max | Target | Met |", "|---|---|---|---|---|---|");
  for (const [label, key] of [
    ["Full index build (incl. first weight computation)", "indexBuild"],
    ["One hybrid search", "search"],
    ["Outfit recommendation with rules", "recommendation"],
  ]) {
    const m = performanceChecks[key];
    lines.push(
      `| ${label} | ${m.meanMs.toFixed(1)} ms | ${m.p95Ms.toFixed(1)} ms | ${m.maxMs.toFixed(1)} ms | < ${m.targetMs} ms | ${m.maxMs < m.targetMs ? "Yes" : "No"} |`
    );
  }
  lines.push("");
  lines.push(
    "Optimizations in place: per-request memoization of item and pair rule results during beam search, cached " +
      "active-rule lists, cached color names, lazily recomputed IDF, cached posting lists, and matchedTerms " +
      "explanations computed only for the returned page.",
    ""
  );

  lines.push("## Limitations", "");
  lines.push(
    "- The query set and labeled outfits are small and built on a 21-item fixture wardrobe. Relevance was " +
      "judged by hand from item descriptions, but by the same author who built the system, so these numbers " +
      "show the algorithms behave as designed; they are not an independent benchmark.",
    "- The labeled-outfit Precision@5 was already 100% without rules (see EVALUATION.md), so it cannot show an " +
      "improvement from rules; the rejection counts above are the more informative rule measurement.",
    "- Latency varies from run to run and machine to machine."
  );
  lines.push("");

  return { report: lines.join("\n"), search, impact, labeled, latency, performanceChecks, typoWins };
}

export function main(outPath = path.join(__dirname, "..", "..", "..", "docs", "algorithms", "EVALUATION_RULES_SEARCH.md")) {
  const { report } = buildReport();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report);
  console.log(`Rules and search evaluation written to ${outPath}`);
  return outPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
