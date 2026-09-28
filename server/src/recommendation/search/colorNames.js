// Color Name Mapping (S6.1). Items store colorHex, users search with words:
// colorName(hex) snaps a hex to the nearest palette entry (searchConfig), and
// colorFamily(hex) returns that entry's coarse family.
//
// Distance is Euclidean in HSV with hue as a circular angle:
//   dH = circularHueDistance(h1, h2) / 180 * min(s1, s2)
//   d  = sqrt(dH^2 + (s1 - s2)^2 + (v1 - v2)^2)
// Hue is scaled by the lower saturation because hue is meaningless for
// greys: #000000 and #FF0000 both have hue 0, and a near-grey should be
// matched on saturation/brightness, not on an arbitrary hue.
import { hexToHsv } from "../color/colorConvert.js";
import { circularHueDistance } from "../utils/math.js";
import { searchConfig } from "../../config/searchConfig.js";

const palette = searchConfig.colorPalette.map((entry) => ({ ...entry, hsv: hexToHsv(entry.hex) }));
const paletteByName = new Map(palette.map((entry) => [entry.name, entry]));

// colorHex -> palette entry. Cached: a wardrobe reuses a small set of hexes.
const nearestCache = new Map();

export function hsvDistance(a, b) {
  const dh = (circularHueDistance(a.h, b.h) / 180) * Math.min(a.s, b.s);
  const ds = a.s - b.s;
  const dv = a.v - b.v;
  return Math.sqrt(dh * dh + ds * ds + dv * dv);
}

// Ties keep the earlier palette entry, so the result is deterministic.
export function nearestPaletteEntry(hex) {
  const key = String(hex).toUpperCase();
  const cached = nearestCache.get(key);
  if (cached) return cached;

  const hsv = hexToHsv(hex);
  let best = palette[0];
  let bestDistance = Infinity;

  for (const entry of palette) {
    const distance = hsvDistance(hsv, entry.hsv);
    if (distance < bestDistance) {
      best = entry;
      bestDistance = distance;
    }
  }

  nearestCache.set(key, best);
  return best;
}

export function colorName(hex) {
  return nearestPaletteEntry(hex).name;
}

export function colorFamily(hex) {
  return nearestPaletteEntry(hex).family;
}

// Palette lookup by name, for requested colors ("black") rather than hexes.
export function paletteColor(name) {
  return paletteByName.get(String(name).toLowerCase()) ?? null;
}

export function paletteColorNames() {
  return palette.map((entry) => entry.name);
}
