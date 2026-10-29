// Every text shown in the UI lives here, so another language can be added in one place.

export const strings = {
  common: {
    typeCodeManually: "Type code manually",
    goHome: "Go to home",
  },
  home: {
    title: "IngrediScan",
    scanBarcode: "Scan barcode",
    typeCode: "Type code",
  },
  scan: {
    title: "Scan",
    hint: "Point the camera at the product's barcode (EAN-13).",
    invalidCode: (code: string) =>
      `Read "${code}", but it is not a valid EAN-13 barcode (wrong check digit).`,
    retry: "Retry",
  },
  cameraPermission: {
    loading: "Checking camera access…",
    explanation:
      "IngrediScan needs the camera only to read product barcodes. Nothing is recorded or saved. You can also type the code yourself.",
    allow: "Allow camera",
    openSettings: "Open Settings",
  },
  manual: {
    title: "Type code",
    label: "Barcode (13 digits, under the bars)",
    placeholder: "e.g. 5941143028337",
    submit: "Check code",
    wrongLength: (count: number) =>
      `The barcode must have exactly 13 digits. You typed ${count}.`,
    wrongCheckDigit:
      "This is not a valid barcode (wrong check digit). Check the digits on the package.",
  },
  product: {
    title: "Product",
    barcodeLabel: "Barcode",
    invalidBarcode: "This link does not contain a valid EAN-13 barcode.",
  },
} as const;
