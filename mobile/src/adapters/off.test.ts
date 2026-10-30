// Reads the real OFF responses straight from the repo's fixtures (not copied into mobile/).
import fixtures from "../../../fixtures/off/products.json";
import { parseOffResponse } from "../api/openFoodFacts";
import { adaptOffProduct } from "./off";

// Each fixture is the raw API body, so it goes through the same parser as the app.
function load(code: string) {
  const entry = (fixtures as { code: string }[]).find((f) => f.code === code);
  if (entry === undefined) throw new Error(`fixture ${code} missing`);
  return parseOffResponse(JSON.stringify(entry));
}

function adapt(code: string) {
  const result = load(code);
  if (result.kind !== "found") throw new Error(`${code}: ${result.kind}`);
  return adaptOffProduct(result.raw);
}

describe("adaptOffProduct on fixtures/off/products.json", () => {
  it("every found fixture passes the parser and the adapter", () => {
    for (const { code } of fixtures as { code: string }[]) {
      const result = load(code);
      expect(["found", "notFound"]).toContain(result.kind);
      if (result.kind === "found") {
        expect(adaptOffProduct(result.raw).barcode).toBe(code);
      }
    }
  });

  it("5941143028337 Franzeluță: Romanian text, complete, gluten + soy traces", () => {
    const p = adapt("5941143028337");
    expect(p.name).toBe("06258 Franzeluță albă");
    expect(p.brand).toBe("Vel Pitar");
    expect(p.quantity).toBe("150 g");
    expect(p.imageUrl).toMatch(/^https:\/\//);
    expect(p.ingredients).toMatchObject({
      language: "ro",
      complete: true,
      source: "off",
      mayContain: null,
      translationRo: null,
    });
    expect(p.ingredients?.text).toMatch(/^Făină albă de grâu/);
    expect(p.offTags).toEqual({
      allergens: ["en:gluten"],
      traces: ["en:soybeans"],
    });
  });

  it("5900951310959 Snickers: found, no ingredient text, empty tags", () => {
    const p = adapt("5900951310959");
    expect(p.name).toBe("Snickers");
    expect(p.ingredients).toBeNull();
    expect(p.offTags).toEqual({ allergens: [], traces: [] });
  });

  it("5711953078798 Cappuccino: German text with lang en → language unknown", () => {
    const p = adapt("5711953078798");
    expect(p.ingredients?.text).toMatch(/^TRINKMILCH/);
    expect(p.ingredients?.language).toBe("unknown");
  });

  it("5053990101597 Sour Cream & Onion: empty _ro text falls back, broken trace tag dropped", () => {
    const p = adapt("5053990101597");
    // ingredients_text_ro is "", so the English text is used, as unknown (lang says ro).
    expect(p.ingredients?.text).toMatch(/^Dehydrated potatoes/);
    expect(p.ingredients?.language).toBe("unknown");
    expect(p.offTags).toEqual({
      allergens: ["en:gluten", "en:milk"],
      traces: [],
    });
  });

  it("6420106196515 SanoVita: ro:Ovaz filtered out", () => {
    const p = adapt("6420106196515");
    expect(p.offTags?.allergens).toEqual(["en:gluten"]);
  });

  it("5941311003173 Viva Chips: text present but not completed", () => {
    const p = adapt("5941311003173");
    expect(p.ingredients?.text).toBeTruthy();
    expect(p.ingredients?.complete).toBe(false);
  });

  it("5941355000688 Lapte integral: en:none filtered, milk only as allergen", () => {
    const p = adapt("5941355000688");
    expect(p.offTags).toEqual({ allergens: ["en:milk"], traces: [] });
  });

  it("5942016310139: product_not_found", () => {
    expect(load("5942016310139")).toEqual({ kind: "notFound" });
  });

  it("uses product_name when product_name_ro is missing", () => {
    expect(adapt("7622210652775").name).toBe("Choco Brownie");
  });
});

describe("adaptOffProduct edge cases", () => {
  const raw = (product: Record<string, unknown>) => ({
    code: "5941143028337",
    product: { schema_version: 1004, ...product },
  });

  it("empty or blank names become null", () => {
    const p = adaptOffProduct(raw({ product_name_ro: "  ", product_name: "" }));
    expect(p.name).toBeNull();
    expect(p.brand).toBeNull();
    expect(p.quantity).toBeNull();
    expect(p.imageUrl).toBeNull();
  });

  it("completed state without any text gives no ingredients", () => {
    const p = adaptOffProduct(
      raw({ ingredients_text: " ", states_tags: ["en:ingredients-completed"] }),
    );
    expect(p.ingredients).toBeNull();
  });

  it("no tag fields at all → offTags null; duplicates removed", () => {
    expect(adaptOffProduct(raw({})).offTags).toBeNull();
    expect(
      adaptOffProduct(raw({ allergens_tags: ["en:milk", "en:milk"] })).offTags,
    ).toEqual({ allergens: ["en:milk"], traces: [] });
  });
});
