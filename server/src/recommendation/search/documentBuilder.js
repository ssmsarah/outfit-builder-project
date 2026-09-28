// Searchable Document Builder (S6.2): turns an item into weighted text
// fields for the TF-IDF index.
//
//   field        source                   weight (repetitions)
//   name         item name                3
//   category     category                 2
//   color        colorName + colorFamily  2
//   style        style                    2
//   pattern      pattern                  1
//   occasions    occasions joined         1
//   seasons      seasons joined           1
//   description  description, if present  1
//
// Weights come from searchConfig.fieldWeights. The text is raw here; the
// normalizer (S6.3) and tokenizer (S6.4) run on it later.
import { colorName, colorFamily } from "./colorNames.js";
import { searchConfig } from "../../config/searchConfig.js";

// Fixture items have no name, only an id like "black_tshirt"; the id is a
// readable fallback (the normalizer turns "_" into a space).
function itemName(item) {
  return item.name ?? String(item.id);
}

export function buildDocument(item) {
  const { fieldWeights } = searchConfig;

  const texts = {
    name: itemName(item),
    category: item.category ?? "",
    color: item.colorHex ? `${colorName(item.colorHex)} ${colorFamily(item.colorHex)}` : "",
    style: item.style ?? "",
    pattern: item.pattern ?? "",
    occasions: (item.occasions ?? []).join(" "),
    seasons: (item.seasons ?? []).join(" "),
    description: item.description ?? "",
  };

  const fields = Object.entries(texts)
    .filter(([, text]) => text.trim() !== "")
    .map(([field, text]) => ({ field, text, weight: fieldWeights[field] }));

  return { id: String(item.id), fields };
}

// The document's text with each field repeated `weight` times, which is how
// field weights reach term frequency.
export function documentText(document) {
  return document.fields
    .flatMap(({ text, weight }) => Array.from({ length: weight }, () => text))
    .join(" ");
}
