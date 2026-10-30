// Open Food Facts client: API v3.6 only, called directly from the phone
// (OFF rate limits are per IP). See docs/open-food-facts.md.

const OFF_URL = "https://world.openfoodfacts.org/api/v3.6/product";

// No email here: it would end up in the bundle and in git.
const USER_AGENT = "IngrediScan/0.1 (student project, UPT)";

const EXPECTED_SCHEMA_VERSION = 1004;

// The final field list from docs/open-food-facts.md. Some are not used yet
// (nutrition, additives, diet tags) but are requested now so the list stays fixed.
export const OFF_FIELDS = [
  "product_name",
  "product_name_ro",
  "brands",
  "quantity",
  "image_front_small_url",
  "lang",
  "states_tags",
  "no_nutrition_data",
  "ingredients_text",
  "ingredients_text_ro",
  "ingredients",
  "allergens_tags",
  "traces_tags",
  "additives_tags",
  "ingredients_analysis_tags",
  "labels_tags",
  "nutrition",
  "schema_version",
].join(",");

/** A found response, checked only for shape; the adapter reads the fields. */
export type OffRawResponse = {
  code: string;
  product: Record<string, unknown>;
};

export type OffResult =
  | { kind: "found"; raw: OffRawResponse }
  | { kind: "notFound" }
  | { kind: "networkError" }
  | { kind: "corruptData"; reason: string };

type ParsedResult = Exclude<OffResult, { kind: "networkError" }>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Body text → result. Parsed from text with JSON.parse in try/catch, not
 * response.json(): OFF data can contain raw control characters that break
 * the parser, and that must become "corrupt data", never an exception.
 */
export function parseOffResponse(text: string): ParsedResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { kind: "corruptData", reason: "invalid JSON" };
  }

  if (!isObject(json) || !isObject(json.result)) {
    return { kind: "corruptData", reason: "missing result" };
  }

  const resultId = json.result.id;
  if (resultId === "product_not_found") {
    return { kind: "notFound" };
  }
  if (resultId !== "product_found") {
    return { kind: "corruptData", reason: `unexpected result.id: ${String(resultId)}` };
  }

  // schema_version comes inside `product`, because it is one of the requested fields.
  const { code, product } = json;
  if (typeof code !== "string" || !isObject(product)) {
    return { kind: "corruptData", reason: "missing code or product" };
  }
  if (product.schema_version !== EXPECTED_SCHEMA_VERSION) {
    return {
      kind: "corruptData",
      reason: `schema_version ${String(product.schema_version)}, expected ${EXPECTED_SCHEMA_VERSION}`,
    };
  }

  return { kind: "found", raw: { code, product } };
}

/** One request, no retries and no cache (those come in later tasks). */
export async function fetchOffProduct(barcode: string): Promise<OffResult> {
  const url = `${OFF_URL}/${encodeURIComponent(barcode)}?fields=${OFF_FIELDS}`;

  let response: Response;
  let text: string;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    text = await response.text();
  } catch {
    return { kind: "networkError" };
  }

  // A missing product comes back as HTTP 404 with a normal JSON body, so 404 is
  // parsed like 200. Anything else (rate limit, server down) is treated like a
  // network problem: the data could not be reached.
  if (response.status !== 200 && response.status !== 404) {
    return { kind: "networkError" };
  }

  return parseOffResponse(text);
}
