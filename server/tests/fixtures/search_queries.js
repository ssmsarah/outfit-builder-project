// Search query set for S6.10 (tests) and I7.6 (evaluation metrics).
//
// Each query lists the fixture items (tests/recommendation/fixtures/
// wardrobe.js) a shopper typing it would want to see. Relevance was judged
// by reading each query against the item descriptions, NOT by running the
// search and copying its output (that would make the evaluation circular).
//
// type:
//   exact           - words as they appear in the item's name
//   typo1 / typo2   - one or two misspelled words
//   synonym         - a configured synonym instead of the indexed word
//   multi_attribute - several attributes (color, style, category, ...)
//   no_match        - nothing in the wardrobe is relevant
//
// Checks (S6.8 criteria style): exact, synonym and multi_attribute queries
// must rank a relevant item first; typo queries must place one in the top
// 3; no_match queries must return an empty list.

export const searchQueries = [
  // --- exact ---
  { query: "black tshirt", type: "exact", relevant: ["black_tshirt"] },
  { query: "white shirt", type: "exact", relevant: ["white_shirt"] },
  { query: "navy shirt", type: "exact", relevant: ["navy_shirt"] },
  { query: "blue jeans", type: "exact", relevant: ["blue_jeans"] },
  { query: "beige chinos", type: "exact", relevant: ["beige_chinos"] },
  { query: "floral skirt", type: "exact", relevant: ["green_floral_skirt"] },
  { query: "white sneakers", type: "exact", relevant: ["white_sneakers"] },
  { query: "black oxfords", type: "exact", relevant: ["black_oxfords"] },
  { query: "grey hoodie", type: "exact", relevant: ["grey_hoodie"] },
  { query: "leather belt", type: "exact", relevant: ["leather_belt"] },
  { query: "silver necklace", type: "exact", relevant: ["silver_necklace"] },
  { query: "wool overcoat", type: "exact", relevant: ["wool_overcoat"] },

  // --- one typo ---
  { query: "blak tshirt", type: "typo1", relevant: ["black_tshirt"] },
  { query: "white sneakrs", type: "typo1", relevant: ["white_sneakers"] },
  { query: "florl skirt", type: "typo1", relevant: ["green_floral_skirt"] },
  { query: "grey hodie", type: "typo1", relevant: ["grey_hoodie"] },
  { query: "leathr belt", type: "typo1", relevant: ["leather_belt"] },
  { query: "silvr necklace", type: "typo1", relevant: ["silver_necklace"] },
  { query: "denim jackt", type: "typo1", relevant: ["denim_jacket"] },

  // --- two typos ---
  { query: "blak tshrt", type: "typo2", relevant: ["black_tshirt"] },
  { query: "whte snekers", type: "typo2", relevant: ["white_sneakers"] },
  { query: "chekced flanel", type: "typo2", relevant: ["checked_flannel_shirt"] },
  { query: "purpel stripd shirt", type: "typo2", relevant: ["purple_striped_shirt"] },
  { query: "runing shose", type: "typo2", relevant: ["sport_running_shoes"] },

  // --- synonym ---
  { query: "black tee", type: "synonym", relevant: ["black_tshirt"] },
  { query: "black t-shirt", type: "synonym", relevant: ["black_tshirt"] },
  { query: "white trainers", type: "synonym", relevant: ["white_sneakers"] },
  { query: "black pants", type: "synonym", relevant: ["black_trousers"] },
  { query: "gray hoodie", type: "synonym", relevant: ["grey_hoodie"] },
  { query: "denim", type: "synonym", relevant: ["blue_jeans", "denim_jacket"] },
  { query: "orange tee", type: "synonym", relevant: ["orange_graphic_tee"] },

  // --- multi-attribute ---
  { query: "black formal shoes", type: "multi_attribute", relevant: ["black_oxfords"] },
  { query: "casual summer dress", type: "multi_attribute", relevant: ["floral_summer_dress"] },
  { query: "formal black dress", type: "multi_attribute", relevant: ["black_cocktail_dress"] },
  { query: "sporty red shorts", type: "multi_attribute", relevant: ["red_shorts"] },
  { query: "smart casual beige", type: "multi_attribute", relevant: ["beige_chinos"] },
  { query: "striped casual top", type: "multi_attribute", relevant: ["purple_striped_shirt"] },
  { query: "blue sporty shoes", type: "multi_attribute", relevant: ["sport_running_shoes"] },

  // --- no match ---
  { query: "zzzz", type: "no_match", relevant: [] },
  { query: "qwerty xyz", type: "no_match", relevant: [] },
  { query: "bikini", type: "no_match", relevant: [] },
];

export const QUERY_TYPES = ["exact", "typo1", "typo2", "synonym", "multi_attribute", "no_match"];

export default searchQueries;
