// Open Food Facts → NormalizedProduct. Pure function, no network or React.
// Rules come from the lessons in docs/open-food-facts.md.

import type { OffRawResponse } from "../api/openFoodFacts";
import type { Ingredients, NormalizedProduct, OffTags } from "./types";

// The 14 EU allergens (Reg. 1169/2011, Annex II) as OFF tags.
// Anything else in OFF's tag lists is dropped (en:none, ro:Ovaz, broken tags).
export const OFF_ALLERGEN_TAGS: readonly string[] = [
  "en:gluten",
  "en:milk",
  "en:eggs",
  "en:peanuts",
  "en:soybeans",
  "en:nuts",
  "en:fish",
  "en:crustaceans",
  "en:molluscs",
  "en:celery",
  "en:mustard",
  "en:sesame-seeds",
  "en:sulphur-dioxide-and-sulphites",
  "en:lupin",
];

const INGREDIENTS_COMPLETED = "en:ingredients-completed";

/** Trimmed non-empty string, otherwise null (OFF often sends ""). */
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === "string");
}

function allowedTags(tags: string[]): string[] {
  // Exact match only: a broken tag like "en:en:gluten  en:milk" is not repaired.
  return [...new Set(tags.filter((tag) => OFF_ALLERGEN_TAGS.includes(tag)))];
}

function adaptIngredients(product: Record<string, unknown>): Ingredients | null {
  // Only the _ro field counts as Romanian. `lang` is not trusted (Cappuccino:
  // lang en with German text; Sour Cream & Onion: lang ro with English text).
  const textRo = text(product.ingredients_text_ro);
  const textAny = text(product.ingredients_text);
  const ingredientsText = textRo ?? textAny;
  if (ingredientsText === null) return null;

  const states = stringList(product.states_tags) ?? [];

  return {
    text: ingredientsText,
    mayContain: null,
    language: textRo !== null ? "ro" : "unknown",
    translationRo: null,
    complete: states.includes(INGREDIENTS_COMPLETED),
    source: "off",
  };
}

function adaptTags(product: Record<string, unknown>): OffTags | null {
  const allergensRaw = stringList(product.allergens_tags);
  const tracesRaw = stringList(product.traces_tags);
  if (allergensRaw === null && tracesRaw === null) return null;

  const allergens = allowedTags(allergensRaw ?? []);
  // A tag in both lists stays only as an allergen (it is in the product).
  const traces = allowedTags(tracesRaw ?? []).filter(
    (tag) => !allergens.includes(tag),
  );
  return { allergens, traces };
}

/**
 * OFF `ingredients[]` is ignored on purpose (storage instructions, broken OCR).
 * Nutrition, additives and diet tags are requested but not used yet.
 */
export function adaptOffProduct(raw: OffRawResponse): NormalizedProduct {
  const { product } = raw;
  return {
    barcode: raw.code,
    name: text(product.product_name_ro) ?? text(product.product_name),
    brand: text(product.brands),
    quantity: text(product.quantity),
    imageUrl: text(product.image_front_small_url),
    ingredients: adaptIngredients(product),
    offTags: adaptTags(product),
  };
}
