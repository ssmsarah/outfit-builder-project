// Labeled outfit dataset for T4.4's Compatibility Precision@5 evaluation.
//
// IMPORTANT - labeling methodology and disclosure:
// These 32 good/bad labels were produced by Claude (the AI assistant
// implementing this sprint) using general, documented fashion-styling
// judgment (formality consistency, color harmony, pattern clash, season/
// occasion coherence) - NOT by running the scoring algorithm itself and
// thresholding its output. Doing the latter would make the evaluation
// circular (testing whether the algorithm agrees with itself). That said,
// these are algorithmically-assisted labels, not independently reviewed by
// a human stylist. Before treating this as authoritative hand-labeled data
// (e.g. for academic submission), a human should read through the `reason`
// field on each entry and correct any label they disagree with - see the
// Decision Log entry for T4.4 in ALGORITHMS_SPRINT_README.md.
//
// Every outfit here is structurally valid per T2.5's isValidOutfit rules,
// built entirely from the T0.4 fixture wardrobe (tests/recommendation/fixtures/wardrobe.js).

export const labeledOutfits = [
  // --- GOOD (18): internally consistent formality, harmonious color/pattern ---
  { ids: ["black_tshirt", "blue_jeans", "white_sneakers"], label: "good", reason: "Classic casual neutral combo" },
  { ids: ["black_tshirt", "blue_jeans", "white_sneakers", "leather_belt"], label: "good", reason: "Same, plus a coherent accent accessory" },
  { ids: ["white_shirt", "black_trousers", "black_oxfords"], label: "good", reason: "Classic monochrome formal outfit" },
  { ids: ["white_shirt", "black_trousers", "black_oxfords", "silver_necklace"], label: "good", reason: "Formal outfit with a matching neutral accessory" },
  { ids: ["navy_shirt", "beige_chinos", "white_sneakers"], label: "good", reason: "Smart-casual neutral palette" },
  { ids: ["navy_shirt", "beige_chinos", "black_oxfords", "leather_belt"], label: "good", reason: "Polished smart-casual look with belt" },
  { ids: ["black_tshirt", "black_trousers", "black_oxfords"], label: "good", reason: "All-neutral monochrome, casual top elevated by formal pieces still reads coherent" },
  { ids: ["grey_hoodie", "blue_jeans", "white_sneakers"], label: "good", reason: "Coherent casual streetwear-adjacent neutral combo" },
  { ids: ["grey_hoodie", "red_shorts", "sport_running_shoes"], label: "good", reason: "Coherent athleisure outfit" },
  { ids: ["purple_striped_shirt", "blue_jeans", "white_sneakers"], label: "good", reason: "Striped accent top on a neutral casual base" },
  { ids: ["checked_flannel_shirt", "blue_jeans", "white_sneakers"], label: "good", reason: "Classic flannel-and-denim casual look" },
  { ids: ["checked_flannel_shirt", "beige_chinos", "black_oxfords"], label: "good", reason: "Flannel dressed up smart-casual" },
  { ids: ["floral_summer_dress", "white_sneakers"], label: "good", reason: "Casual summer dress with casual shoes" },
  { ids: ["floral_summer_dress", "white_sneakers", "leather_belt"], label: "good", reason: "Same, cinched with a belt" },
  { ids: ["black_cocktail_dress", "black_oxfords", "silver_necklace"], label: "good", reason: "Formal evening look, neutral and cohesive" },
  { ids: ["black_cocktail_dress", "black_oxfords", "wool_overcoat"], label: "good", reason: "Formal winter evening look" },
  { ids: ["navy_shirt", "black_trousers", "black_oxfords"], label: "good", reason: "Smart-casual top blends fine into a formal-leaning neutral outfit" },
  { ids: ["black_tshirt", "beige_chinos", "white_sneakers"], label: "good", reason: "Relaxed casual/smart-casual neutral combo" },

  // --- BAD (14): clashing formality, color, or pattern ---
  { ids: ["white_shirt", "red_shorts", "sport_running_shoes"], label: "bad", reason: "Formal shirt clashes with athletic shorts and running shoes" },
  { ids: ["orange_graphic_tee", "black_trousers", "black_oxfords"], label: "bad", reason: "Streetwear graphic tee clashes with formal trousers and oxfords" },
  { ids: ["checked_flannel_shirt", "green_floral_skirt", "white_sneakers"], label: "bad", reason: "Checked top and floral skirt clash patterns" },
  { ids: ["purple_striped_shirt", "red_shorts", "sport_running_shoes"], label: "bad", reason: "Striped purple top clashes with sporty red shorts, both in color and style" },
  { ids: ["white_shirt", "green_floral_skirt", "sport_running_shoes"], label: "bad", reason: "Formal shirt, casual floral skirt, and sporty shoes send three different signals" },
  { ids: ["orange_graphic_tee", "black_trousers", "sport_running_shoes"], label: "bad", reason: "Streetwear, formal, and sporty pieces collide" },
  { ids: ["navy_shirt", "red_shorts", "black_oxfords"], label: "bad", reason: "Smart-casual top, sporty shorts, formal shoes - three clashing registers" },
  { ids: ["checked_flannel_shirt", "red_shorts", "sport_running_shoes"], label: "bad", reason: "Busy checked pattern with bold red athletic shorts, casual-vs-sporty mismatch" },
  { ids: ["white_shirt", "green_floral_skirt", "white_sneakers"], label: "bad", reason: "Formal shirt paired with a casual floral skirt" },
  { ids: ["purple_striped_shirt", "green_floral_skirt", "sport_running_shoes"], label: "bad", reason: "Striped and floral patterns clash, plus a casual/sporty mismatch" },
  { ids: ["orange_graphic_tee", "red_shorts", "black_oxfords"], label: "bad", reason: "Graphic streetwear top, sporty shorts, and formal shoes; loud orange/red color clash" },
  { ids: ["checked_flannel_shirt", "beige_chinos", "sport_running_shoes"], label: "bad", reason: "Casual flannel, smart-casual chinos, and sporty shoes don't agree" },
  { ids: ["white_shirt", "red_shorts", "white_sneakers"], label: "bad", reason: "Formal top with sporty shorts and casual shoes - inconsistent formality throughout" },
  { ids: ["floral_summer_dress", "black_oxfords"], label: "bad", reason: "Casual floral summer dress mismatched with formal oxfords" },
];
