// Canonical enum values for the outfit-algorithm item attributes (T0.2).
// Shared by the Product Mongoose schema and by the pure-function algorithm
// layer's domain "item" objects, so the two representations can never drift
// apart. See docs/algorithms/AUDIT.md and the Decision Log for why the
// algorithm layer's items use `category` while Product uses `outfitCategory`.

export const CATEGORIES = ["top", "bottom", "shoes", "accessory", "outerwear", "dress"];
export const STYLES = ["casual", "formal", "smart_casual", "streetwear", "sporty"];
export const PATTERNS = ["solid", "striped", "checked", "graphic", "floral"];
export const SEASONS = ["spring", "summer", "autumn", "winter"];
export const OCCASIONS = ["casual", "work", "formal", "party", "sport"];
