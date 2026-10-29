import { isValidEan13 } from "./ean13";

describe("isValidEan13", () => {
  it.each(["5941143028337", "5900951310959", "3560070272174"])(
    "accepts the real product code %s",
    (code) => {
      expect(isValidEan13(code)).toBe(true);
    },
  );

  it("rejects 14 digits (mistyped code from the OFF test)", () => {
    expect(isValidEan13("59000020012067")).toBe(false);
  });

  it("rejects a wrong check digit", () => {
    expect(isValidEan13("5941143028338")).toBe(false);
  });

  it.each([
    ["12 digits", "594114302833"],
    ["empty string", ""],
    ["letters", "59411430283AB"],
    ["inner space", "594 1143028337"],
    ["leading space", " 5941143028337"],
    ["trailing newline", "5941143028337\n"],
    ["non-ASCII digits", "٥٩٤١١٤٣٠٢٨٣٣٧"],
  ])("rejects %s", (_label, code) => {
    expect(isValidEan13(code)).toBe(false);
  });
});
