// Signal Normalization and Time Decay (T3.2). Pure function: takes an
// already-fetched list of one user's interactions (plain objects or
// Mongoose Interaction documents both work - only itemId/type/timestamp are
// read) and returns per-item {L, V, S, P} signals. No DB access here; the
// DB round trip (interactionService.getUserInteractions) happens at the
// call site, keeping this testable and reusable per instruction 8.
import { scoringConfig } from "../../config/scoringConfig.js";
import { clamp01 } from "../utils/math.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function decay(ageDays, halfLifeDays = scoringConfig.decayHalfLifeDays) {
  return Math.pow(0.5, ageDays / halfLifeDays);
}

function ageDaysBetween(timestamp, now) {
  return (now.getTime() - new Date(timestamp).getTime()) / MS_PER_DAY;
}

function safeDiv(numerator, denominator) {
  return denominator === 0 ? 0 : numerator / denominator;
}

// Returns a Map<itemId (string), { L, V, S, P }> covering every item that
// has at least one interaction. Items with zero interactions simply have
// no entry - callers treat a missing entry as all-zero signals.
export function computeUserItemSignals(
  interactions,
  { now = new Date(), halfLifeDays = scoringConfig.decayHalfLifeDays } = {}
) {
  const byItem = new Map();

  for (const interaction of interactions) {
    const itemId = String(interaction.itemId);
    if (!byItem.has(itemId)) {
      byItem.set(itemId, { liked: false, decayedViews: 0, decayedSaves: 0, decayedPurchases: 0 });
    }
    const entry = byItem.get(itemId);
    const d = decay(ageDaysBetween(interaction.timestamp, now), halfLifeDays);

    switch (interaction.type) {
      case "like":
        entry.liked = true;
        break;
      case "view":
        entry.decayedViews += d;
        break;
      case "save":
        entry.decayedSaves += d;
        break;
      case "purchase":
        entry.decayedPurchases += d;
        break;
      default:
        throw new Error(`computeUserItemSignals: unknown interaction type "${interaction.type}"`);
    }
  }

  const entries = [...byItem.values()];
  const maxViews = Math.max(0, ...entries.map((e) => e.decayedViews));
  const maxSaves = Math.max(0, ...entries.map((e) => e.decayedSaves));
  const maxPurchases = Math.max(0, ...entries.map((e) => e.decayedPurchases));

  const signals = new Map();
  for (const [itemId, entry] of byItem) {
    signals.set(itemId, {
      L: entry.liked ? 1 : 0,
      V: clamp01(safeDiv(Math.log(1 + entry.decayedViews), Math.log(1 + maxViews))),
      S: clamp01(safeDiv(entry.decayedSaves, maxSaves)),
      P: clamp01(safeDiv(entry.decayedPurchases, maxPurchases)),
    });
  }

  return signals;
}
