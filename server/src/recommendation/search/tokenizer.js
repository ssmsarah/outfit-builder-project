// Word and Character N-gram Tokenizer (S6.4). Every text yields two token
// streams, one per TF-IDF vector space (S6.5):
//   - word tokens: the normalized text split on spaces
//   - char n-grams: each word padded as "#word#", then every n-gram
//     (n = searchConfig.ngramSize), e.g. black -> #bl bla lac ack ck#
// Char n-grams give typo tolerance: "blak" shares "#bl" and "bla" with
// "black". Pure functions.
import { normalizeTokens } from "./normalizer.js";
import { searchConfig } from "../../config/searchConfig.js";

export const PAD = "#";

export function wordTokens(text) {
  return normalizeTokens(text);
}

// N-grams of one word. A padded word shorter than n (only possible when
// n > 3) is kept whole, so every word yields at least one n-gram.
export function wordNgrams(word, n = searchConfig.ngramSize) {
  const padded = `${PAD}${word}${PAD}`;
  if (padded.length <= n) return [padded];

  const grams = [];
  for (let i = 0; i + n <= padded.length; i++) {
    grams.push(padded.slice(i, i + n));
  }
  return grams;
}

export function charNgrams(words, n = searchConfig.ngramSize) {
  return words.flatMap((word) => wordNgrams(word, n));
}

export function tokenize(text) {
  const words = wordTokens(text);
  return { words, chars: charNgrams(words) };
}
