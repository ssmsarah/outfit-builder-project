// Extra fixture items for the rule engine (R5.9). The T0.4 wardrobe is left
// untouched (earlier sprints snapshot it), but it has no summer-only item,
// so winter_no_summer_only could never fire on it. This item fills that gap.
export const ruleFixtureItems = [
  {
    id: "linen_summer_top",
    category: "top",
    colorHex: "#F0E6D2",
    style: "casual",
    pattern: "solid",
    seasons: ["summer"],
    occasions: ["casual"],
  },
];

export default ruleFixtureItems;
