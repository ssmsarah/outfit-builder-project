// S6.9 (pure layer): an index maintained with add/update/remove must be
// indistinguishable from one rebuilt from scratch over the final item set.
import { describe, it, expect } from "vitest";
import { createSearchIndex, indexItem, removeItem, rankAll } from "../../../src/recommendation/search/searchIndex.js";
import { refreshWeights } from "../../../src/recommendation/search/tfidfVectorizer.js";
import { wardrobe, wardrobeById as w } from "../fixtures/wardrobe.js";

const QUERIES = ["black tshirt", "blak tshrt", "white sneakrs", "floral skirt", "velvet blazer", "grey", "zzzz"];

const velvetBlazer = {
  id: "velvet_blazer",
  name: "Velvet Blazer",
  category: "outerwear",
  colorHex: "#800000",
  style: "formal",
  pattern: "solid",
  seasons: ["autumn", "winter"],
  occasions: ["formal", "party"],
};

function snapshot(index) {
  const space = (s) => {
    refreshWeights(s);
    return {
      df: [...s.df].sort(),
      idf: [...s.idf].sort(),
      vectors: [...s.vectors].sort().map(([id, v]) => [id, [...v].sort()]),
    };
  };
  return { ids: [...index.items.keys()].sort(), word: space(index.word), char: space(index.char) };
}

function expectSameAsRebuild(index, finalItems) {
  const rebuilt = createSearchIndex(finalItems);
  expect(snapshot(index)).toEqual(snapshot(rebuilt));
  for (const query of QUERIES) {
    expect(rankAll(index, query, { minScore: 0 })).toEqual(rankAll(rebuilt, query, { minScore: 0 }));
  }
}

describe("incremental index - README acceptance criteria", () => {
  it("after adding a new item, a search immediately finds it", () => {
    const index = createSearchIndex(wardrobe);
    expect(rankAll(index, "velvet blazer").map((r) => r.itemId)).not.toContain("velvet_blazer");

    indexItem(index, velvetBlazer);
    expect(rankAll(index, "velvet blazer")[0].itemId).toBe("velvet_blazer");
  });

  it("after deleting, an item never appears", () => {
    const index = createSearchIndex(wardrobe);
    removeItem(index, "black_tshirt");

    for (const query of [...QUERIES, "black", "tshirt", "casual", "top"]) {
      expect(rankAll(index, query, { minScore: 0 }).map((r) => r.itemId)).not.toContain("black_tshirt");
    }
  });

  it("incremental result equals a full rebuild (add)", () => {
    const index = createSearchIndex(wardrobe);
    indexItem(index, velvetBlazer);
    expectSameAsRebuild(index, [...wardrobe, velvetBlazer]);
  });

  it("incremental result equals a full rebuild (remove)", () => {
    const index = createSearchIndex(wardrobe);
    removeItem(index, "green_floral_skirt");
    removeItem(index, "white_sneakers");
    expectSameAsRebuild(
      index,
      wardrobe.filter((i) => i.id !== "green_floral_skirt" && i.id !== "white_sneakers")
    );
  });

  it("incremental result equals a full rebuild (update)", () => {
    const index = createSearchIndex(wardrobe);
    const renamed = { ...w.black_tshirt, name: "Midnight Crew Tee", colorHex: "#1F2A44" };
    indexItem(index, renamed);

    const final = wardrobe.map((i) => (i.id === "black_tshirt" ? renamed : i));
    expectSameAsRebuild(index, final);
    expect(rankAll(index, "midnight crew")[0].itemId).toBe("black_tshirt");
  });

  it("incremental result equals a full rebuild after a mixed sequence", () => {
    const index = createSearchIndex(wardrobe.slice(0, 5));
    for (const item of wardrobe.slice(5)) indexItem(index, item);
    indexItem(index, velvetBlazer);
    removeItem(index, "red_shorts");
    indexItem(index, { ...w.navy_shirt, pattern: "striped" });
    removeItem(index, "velvet_blazer");

    const final = wardrobe
      .filter((i) => i.id !== "red_shorts")
      .map((i) => (i.id === "navy_shirt" ? { ...w.navy_shirt, pattern: "striped" } : i));
    expectSameAsRebuild(index, final);
  });

  it("removing an unknown id is a no-op", () => {
    const index = createSearchIndex(wardrobe);
    expect(removeItem(index, "does_not_exist")).toBe(false);
    expectSameAsRebuild(index, wardrobe);
  });
});
