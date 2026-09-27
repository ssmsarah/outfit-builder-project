// HEX -> HSV conversion (T1.1). Pure function - no caching here, so it stays
// trivially unit-testable; getItemHsv() below adds the "cache HSV on the
// item" behavior the ticket asks for as a thin wrapper.

const HEX_RE = /^#([0-9A-Fa-f]{6})$/;

export function hexToHsv(hex) {
  if (typeof hex !== "string" || !HEX_RE.test(hex)) {
    throw new Error(`hexToHsv: invalid hex color "${hex}"`);
  }

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  const v = max;
  const s = max === 0 ? 0 : delta / max;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
    if (h < 0) h += 360;
  }

  return { h, s, v };
}

// Computes (and caches) HSV on an item's `.hsv` property so repeated
// pairwise comparisons within one outfit-generation pass (T2.7) don't
// re-parse the same hex string over and over.
export function getItemHsv(item) {
  if (!item.hsv) {
    item.hsv = hexToHsv(item.colorHex);
  }
  return item.hsv;
}
