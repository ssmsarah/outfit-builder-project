// Seed wardrobe fixture (T0.4). Plain data only - no Mongoose, no DB - so it
// loads in any test file with a bare import. Items use the pure algorithm
// domain shape (`category`, not `outfitCategory`): see Decision Log T0.4 for
// why that differs from the Product Mongoose model's field name.
//
// The 12 items below (up to "purple_striped_shirt") have README-mandated
// id/category/colorHex/style/pattern/isNeutralOverride values used by later
// ticket tests (T1.5, T1.6, T2.6, T2.7, T2.9, ...). Their seasons/occasions
// weren't specified by the README, so reasonable values were chosen per
// item and logged as an assumption (T0.4 Decision Log).
//
// The remaining items exist to guarantee every category, style, and pattern
// enum value is covered at least once (checked pattern, and the
// accessory/outerwear/dress categories, only appear here).

export const wardrobe = [
  // --- README-mandated fixtures ---
  {
    id: "black_tshirt",
    category: "top",
    colorHex: "#000000",
    style: "casual",
    pattern: "solid",
    seasons: ["spring", "summer", "autumn", "winter"],
    occasions: ["casual"],
  },
  {
    id: "white_shirt",
    category: "top",
    colorHex: "#FFFFFF",
    style: "formal",
    pattern: "solid",
    seasons: ["spring", "summer", "autumn", "winter"],
    occasions: ["work", "formal"],
  },
  {
    id: "navy_shirt",
    category: "top",
    colorHex: "#1F2A44",
    isNeutralOverride: true,
    style: "smart_casual",
    pattern: "solid",
    seasons: ["spring", "summer", "autumn", "winter"],
    occasions: ["work", "casual"],
  },
  {
    id: "blue_jeans",
    category: "bottom",
    colorHex: "#3B5B92",
    isNeutralOverride: true,
    style: "casual",
    pattern: "solid",
    seasons: ["spring", "summer", "autumn", "winter"],
    occasions: ["casual"],
  },
  {
    id: "beige_chinos",
    category: "bottom",
    colorHex: "#D8C8A8",
    style: "smart_casual",
    pattern: "solid",
    seasons: ["spring", "summer", "autumn", "winter"],
    occasions: ["work", "casual"],
  },
  {
    id: "black_trousers",
    category: "bottom",
    colorHex: "#111111",
    style: "formal",
    pattern: "solid",
    seasons: ["spring", "summer", "autumn", "winter"],
    occasions: ["work", "formal"],
  },
  {
    id: "red_shorts",
    category: "bottom",
    colorHex: "#CC2222",
    style: "sporty",
    pattern: "solid",
    seasons: ["spring", "summer"],
    occasions: ["sport"],
  },
  {
    id: "green_floral_skirt",
    category: "bottom",
    colorHex: "#2E8B57",
    style: "casual",
    pattern: "floral",
    seasons: ["spring", "summer"],
    occasions: ["casual", "party"],
  },
  {
    id: "white_sneakers",
    category: "shoes",
    colorHex: "#F5F5F5",
    style: "casual",
    pattern: "solid",
    seasons: ["spring", "summer", "autumn", "winter"],
    occasions: ["casual", "sport"],
  },
  {
    id: "black_oxfords",
    category: "shoes",
    colorHex: "#0A0A0A",
    style: "formal",
    pattern: "solid",
    seasons: ["spring", "summer", "autumn", "winter"],
    occasions: ["work", "formal"],
  },
  {
    id: "orange_graphic_tee",
    category: "top",
    colorHex: "#E67E22",
    style: "streetwear",
    pattern: "graphic",
    seasons: ["spring", "summer"],
    occasions: ["casual", "party"],
  },
  {
    id: "purple_striped_shirt",
    category: "top",
    colorHex: "#7D3C98",
    style: "casual",
    pattern: "striped",
    seasons: ["spring", "summer", "autumn", "winter"],
    occasions: ["casual"],
  },

  // --- Additional fixtures: cover accessory/outerwear/dress + checked pattern ---
  {
    id: "floral_summer_dress",
    category: "dress",
    colorHex: "#E8A0BF",
    style: "casual",
    pattern: "floral",
    seasons: ["spring", "summer"],
    occasions: ["casual", "party"],
  },
  {
    id: "black_cocktail_dress",
    category: "dress",
    colorHex: "#050505",
    isNeutralOverride: true,
    style: "formal",
    pattern: "solid",
    seasons: ["autumn", "winter"],
    occasions: ["formal", "party"],
  },
  {
    id: "denim_jacket",
    category: "outerwear",
    colorHex: "#3B5B92",
    isNeutralOverride: true,
    style: "casual",
    pattern: "solid",
    seasons: ["spring", "autumn"],
    occasions: ["casual"],
  },
  {
    id: "wool_overcoat",
    category: "outerwear",
    colorHex: "#4A4A4A",
    isNeutralOverride: true,
    style: "formal",
    pattern: "solid",
    seasons: ["winter"],
    occasions: ["work", "formal"],
  },
  {
    id: "leather_belt",
    category: "accessory",
    colorHex: "#5C4033",
    style: "smart_casual",
    pattern: "solid",
    seasons: ["spring", "summer", "autumn", "winter"],
    occasions: ["work", "casual"],
  },
  {
    id: "silver_necklace",
    category: "accessory",
    colorHex: "#C0C0C0",
    isNeutralOverride: true,
    style: "formal",
    pattern: "solid",
    seasons: ["spring", "summer", "autumn", "winter"],
    occasions: ["formal", "party"],
  },
  {
    id: "checked_flannel_shirt",
    category: "top",
    colorHex: "#8B3A3A",
    style: "casual",
    pattern: "checked",
    seasons: ["autumn", "winter"],
    occasions: ["casual"],
  },
  {
    id: "grey_hoodie",
    category: "top",
    colorHex: "#808080",
    isNeutralOverride: true,
    style: "streetwear",
    pattern: "solid",
    seasons: ["spring", "autumn", "winter"],
    occasions: ["casual", "sport"],
  },
  {
    id: "sport_running_shoes",
    category: "shoes",
    colorHex: "#1E90FF",
    style: "sporty",
    pattern: "solid",
    seasons: ["spring", "summer", "autumn", "winter"],
    occasions: ["sport"],
  },
];

export const wardrobeById = Object.fromEntries(
  wardrobe.map((item) => [item.id, item])
);

export default wardrobe;
