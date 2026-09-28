// S6.10: consolidated Sprint 6 tests. Runs the query set in
// tests/fixtures/search_queries.js against the fixture wardrobe with the
// S6.8 criteria style checks, plus the Sprint 6 Definition of Done and a
// module-isolation guard for the search layer.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createSearchIndex, searchIndex, indexItem, removeItem } from "../../../src/recommendation/search/searchIndex.js";
import { searchQueries, QUERY_TYPES } from "../../fixtures/search_queries.js";
import { wardrobe, wardrobeById } from "../fixtures/wardrobe.js";

const index = createSearchIndex(wardrobe);
const byType = (type) => searchQueries.filter((q) => q.type === type);

describe("S6.10 - query set", () => {
  it("has at least 30 queries covering every query type", () => {
    expect(searchQueries.length).toBeGreaterThanOrEqual(30);
    for (const type of QUERY_TYPES) {
      expect(byType(type).length, type).toBeGreaterThan(0);
    }
  });

  it("only references fixture items", () => {
    for (const { relevant } of searchQueries) {
      for (const id of relevant) expect(wardrobeById[id], id).toBeDefined();
    }
  });
});

describe("S6.10 - exact, synonym and multi-attribute queries rank a relevant item first", () => {
  const queries = [...byType("exact"), ...byType("synonym"), ...byType("multi_attribute")];

  it.each(queries.map((q) => [q.query, q]))("%j", (query, { relevant }) => {
    const results = searchIndex(index, query);
    expect(relevant).toContain(results[0]?.itemId);
  });

  it("a query with several relevant items ranks all of them first", () => {
    for (const { query, relevant } of queries.filter((q) => q.relevant.length > 1)) {
      const top = searchIndex(index, query, { limit: relevant.length }).map((r) => r.itemId);
      expect(top.sort()).toEqual([...relevant].sort());
    }
  });
});

describe("S6.10 - typo queries place a relevant item in the top 3", () => {
  const queries = [...byType("typo1"), ...byType("typo2")];

  it.each(queries.map((q) => [q.query, q]))("%j", (query, { relevant }) => {
    const top3 = searchIndex(index, query, { limit: 3 }).map((r) => r.itemId);
    expect(top3.some((id) => relevant.includes(id))).toBe(true);
  });
});

describe("S6.10 - no-match queries return nothing", () => {
  it.each(byType("no_match").map((q) => [q.query]))("%j", (query) => {
    expect(searchIndex(index, query)).toEqual([]);
  });
});

describe("Sprint 6 Definition of Done", () => {
  it('typo- and synonym-tolerant: "blak casul tee" finds the black casual t-shirt', () => {
    const [top] = searchIndex(index, "blak casul tee");
    expect(top.itemId).toBe("black_tshirt");
  });

  it("returns ranked, explained results", () => {
    const results = searchIndex(index, "white sneakrs");
    for (let i = 1; i < results.length; i++) expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    expect(results[0]).toEqual(
      expect.objectContaining({ sWord: expect.any(Number), sChar: expect.any(Number), matchedTerms: ["white", "sneakers"] })
    );
  });

  it("the index stays consistent with the wardrobe as items change", () => {
    const live = createSearchIndex(wardrobe);
    removeItem(live, "white_sneakers");
    expect(searchIndex(live, "white sneakers").map((r) => r.itemId)).not.toContain("white_sneakers");
    indexItem(live, wardrobeById.white_sneakers);
    expect(searchIndex(live, "white sneakers")[0].itemId).toBe("white_sneakers");
  });
});

describe("Sprint 6 module isolation", () => {
  const searchDir = join(dirname(fileURLToPath(import.meta.url)), "../../../src/recommendation/search");

  it.each(readdirSync(searchDir))("%s does not import models, services, mongoose, or a search/ML library", (file) => {
    const source = readFileSync(join(searchDir, file), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*\/(models|services)\//);
    // Instruction 8: TF-IDF is implemented directly, so only relative imports.
    for (const [, specifier] of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      expect(specifier.startsWith("."), specifier).toBe(true);
    }
  });
});
