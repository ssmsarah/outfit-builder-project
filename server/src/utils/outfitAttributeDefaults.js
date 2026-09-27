// Derives the new T0.2 outfit-algorithm attributes from the marketplace
// Product fields that already exist (`category`, `colors`), so both new
// documents (via the pre-validate hook on Product) and the one-off backfill
// script (scripts/backfillOutfitAttributes.js) share one mapping.
import { SEASONS } from "../recommendation/itemEnums.js";

const CATEGORY_PRIORITY = [
  { legacy: "dresses", outfitCategory: "dress" },
  { legacy: "shoes", outfitCategory: "shoes" },
  { legacy: "accessories", outfitCategory: "accessory" },
  { legacy: "bottoms", outfitCategory: "bottom" },
  { legacy: "tops", outfitCategory: "top" },
  // "formals" has no direct equivalent in the new slot-based enum (it's a
  // style, not a garment slot) - it most often refers to shirts/blazers, so
  // it falls back to "top". See Decision Log T0.2.
  { legacy: "formals", outfitCategory: "top" },
];

// No legacy category maps to "outerwear" - only newly tagged items will use it.
const FALLBACK_OUTFIT_CATEGORY = "top";

const NEUTRAL_COLOR_NAMES = new Set([
  "black",
  "white",
  "grey",
  "gray",
  "beige",
  "cream",
  "brown",
  "navy",
  "denim",
]);

const COLOR_NAME_TO_HEX = {
  black: "#000000",
  white: "#FFFFFF",
  grey: "#808080",
  gray: "#808080",
  beige: "#D8C8A8",
  cream: "#FFFDD0",
  brown: "#6B4423",
  navy: "#1F2A44",
  denim: "#3B5B92",
  blue: "#3B5B92",
  red: "#CC2222",
  green: "#2E8B57",
  orange: "#E67E22",
  purple: "#7D3C98",
  pink: "#E91E8C",
  yellow: "#F1C40F",
  maroon: "#800000",
  olive: "#808000",
  teal: "#008080",
};

// Unmapped color names fall back to neutral gray rather than guessing wrong.
const FALLBACK_HEX = "#808080";

export function deriveOutfitCategory(legacyCategories = []) {
  for (const { legacy, outfitCategory } of CATEGORY_PRIORITY) {
    if (legacyCategories.includes(legacy)) {
      return outfitCategory;
    }
  }
  return FALLBACK_OUTFIT_CATEGORY;
}

export function deriveColorHex(legacyColors = []) {
  for (const name of legacyColors) {
    const hex = COLOR_NAME_TO_HEX[String(name).toLowerCase()];
    if (hex) return hex;
  }
  return FALLBACK_HEX;
}

// Returns true only when a legacy color name is recognizably neutral;
// otherwise undefined (leave the field unset rather than forcing false).
export function deriveIsNeutralOverride(legacyColors = []) {
  const isNeutral = legacyColors.some((name) =>
    NEUTRAL_COLOR_NAMES.has(String(name).toLowerCase())
  );
  return isNeutral ? true : undefined;
}

export const DEFAULT_STYLE = "casual";
export const DEFAULT_PATTERN = "solid";
export const ALL_SEASONS = SEASONS;
export const DEFAULT_OCCASIONS = ["casual"];
