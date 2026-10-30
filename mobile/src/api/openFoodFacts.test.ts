import { parseOffResponse } from "./openFoodFacts";

const found = (product: Record<string, unknown>) =>
  JSON.stringify({
    code: "5941143028337",
    result: { id: "product_found" },
    status: "success",
    product,
  });

describe("parseOffResponse", () => {
  it("accepts a found product with schema_version 1004", () => {
    const result = parseOffResponse(
      found({ product_name: "Test", schema_version: 1004 }),
    );
    expect(result).toEqual({
      kind: "found",
      raw: {
        code: "5941143028337",
        product: { product_name: "Test", schema_version: 1004 },
      },
    });
  });

  it("a raw control character inside a string → corrupt data, not an exception", () => {
    // \u0001 written literally (unescaped) into the body, as OFF sometimes sends.
    const body = found({ product_name: "Pringles", schema_version: 1004 }).replace(
      "Pringles",
      "Prin\u0001gles",
    );
    expect(() => JSON.parse(body)).toThrow();
    expect(parseOffResponse(body)).toMatchObject({ kind: "corruptData" });
  });

  it("schema_version 1003 → corrupt data", () => {
    expect(
      parseOffResponse(found({ product_name: "Test", schema_version: 1003 })),
    ).toMatchObject({ kind: "corruptData" });
  });

  it("missing schema_version → corrupt data", () => {
    expect(parseOffResponse(found({ product_name: "Test" }))).toMatchObject({
      kind: "corruptData",
    });
  });

  it("product_not_found (the HTTP 404 body) → notFound", () => {
    const body = JSON.stringify({
      code: "5948765123099",
      result: { id: "product_not_found" },
      status: "failure",
    });
    expect(parseOffResponse(body)).toEqual({ kind: "notFound" });
  });

  it.each([
    ["empty body", ""],
    ["HTML error page", "<html>502 Bad Gateway</html>"],
    ["JSON array", "[]"],
    ["no result", JSON.stringify({ product: {} })],
    ["unknown result id", JSON.stringify({ result: { id: "something_else" } })],
    ["found without product", JSON.stringify({ code: "1", result: { id: "product_found" } })],
  ])("%s → corrupt data", (_label, body) => {
    expect(parseOffResponse(body)).toMatchObject({ kind: "corruptData" });
  });
});
