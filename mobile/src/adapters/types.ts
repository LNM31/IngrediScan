// The one product shape every source (OFF, our backend, Gemini) is adapted to.
// The discriminator and the rest of the flow only ever see this type.

export type NormalizedProduct = {
  barcode: string;
  name: string | null;
  brand: string | null;
  quantity: string | null; // display only
  imageUrl: string | null; // display only
  ingredients: Ingredients | null; // null = no ingredient text at all
  offTags: OffTags | null; // secondary signal, already filtered
};

export type Ingredients = {
  text: string;
  mayContain: string | null; // OFF: null (the sentence is inside `text`; the discriminator splits it)
  language: string; // 'ro' | 'en' | ... | 'unknown'
  translationRo: string | null;
  complete: boolean;
  source: "off" | "ai" | "user";
};

export type OffTags = {
  allergens: string[];
  traces: string[];
};
