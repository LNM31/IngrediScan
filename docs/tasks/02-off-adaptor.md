# 02 · Open Food Facts → `NormalizedProduct` → numele pe ecran

**Parte:** mobile · **Depinde de:** 01 · **Stare:** ⏳

## Scop

După scanare, aplicația cere produsul de la Open Food Facts și afișează numele, brandul, cantitatea și poza, sau „Product not found”. Datele trec printr-un adaptor testat pe fixtures, care produce `NormalizedProduct`, tipul pe care îl vor folosi discriminatorul (04) și restul fluxului.

## De citit întâi

- `docs/open-food-facts.md` (tot: endpoint, câmpuri, lecții → reguli)
- `docs/architecture.md`, secțiunea „`NormalizedProduct`”
- `mobile/CLAUDE.md`

## Ce se face

1. **Clientul OFF** (`src/api/`): `GET https://world.openfoodfacts.org/api/v3.6/product/{barcode}?fields=...` cu lista exactă de câmpuri din `open-food-facts.md`, header `User-Agent: IngrediScan/0.1 (student project, UPT)` (fără email: ar ajunge în bundle și în git; se adaugă unul creat pentru proiect doar dacă aplicația e publicată). Rezultatul e unul dintre:
   - găsit → JSON-ul brut;
   - `product_not_found`;
   - eroare de rețea;
   - **date corupte**: JSON care nu se parsează (caractere de control, vezi lecțiile) sau `schema_version` ≠ 1004.

   Parsarea se face din text (`response.text()` + `JSON.parse` în `try/catch`), nu cu `response.json()`.
2. **Tipul `NormalizedProduct`** (`src/adapters/` sau un fișier de tipuri comun):
   ```ts
   type NormalizedProduct = {
     barcode: string;
     name: string | null;
     brand: string | null;
     quantity: string | null;      // doar afișare
     imageUrl: string | null;      // doar afișare
     ingredients: Ingredients | null;   // null = nu există text deloc
     offTags: { allergens: string[]; traces: string[] } | null;  // semnal secundar, filtrat
   };
   type Ingredients = {
     text: string;
     mayContain: string | null;    // OFF: null (propoziția e în text; discriminatorul împarte textul)
     language: string;             // 'ro' | 'en' | ... | 'unknown'
     translationRo: string | null;
     complete: boolean;
     source: 'off' | 'ai' | 'user';
   };
   ```
   Nutriția **nu** intră încă (vine la task-ul 06, când e nevoie de ea la salvare).
3. **Adaptorul OFF** (funcție pură: JSON brut → `NormalizedProduct`), cu regulile din lecții:
   - **nume**: `product_name_ro`, altfel `product_name`, altfel `null`; gol → `null`;
   - **textul**: dacă `ingredients_text_ro` e negol → `language: 'ro'`; altfel, dacă `ingredients_text` e negol → **`language: 'unknown'`** (câmpul `lang` nu e de încredere: Cappuccino are `lang: en` cu text în germană, Sour Cream & Onion are `lang: ro` cu text în engleză); altfel `ingredients: null`;
   - **`complete`**: `true` doar dacă `states_tags` conține `en:ingredients-completed` și textul e negol;
   - **tag-uri**: `allergens_tags` și `traces_tags` filtrate pe lista albă a celor 14 tag-uri din `open-food-facts.md` (pleacă `en:none`, `ro:Ovaz`, `en:en:gluten  en:milk` etc.); un tag prezent și la alergeni, și la urme rămâne doar la alergeni;
   - `ingredients[]` din OFF se ignoră (lecția 6).
4. **Ecranul de produs** din task-ul 01 afișează: loading → nume / brand / cantitate / poză, sau „Product not found”, sau „Couldn't load product data” (rețea / date corupte), cu un buton „Scan another”. Textele în fișierul de texte UI.

## Criterii de acceptare

- [ ] Teste pe adaptor care citesc direct `fixtures/off/products.json` (nu copiază fixture-ul în `mobile/`), cel puțin:
  - `5941143028337` (Franzeluță): nume, `language: 'ro'`, `complete: true`, `allergens: ['en:gluten']`, `traces: ['en:soybeans']`
  - `5900951310959` (Snickers): găsit, `ingredients: null`, tag-uri goale
  - `5711953078798` (Cappuccino, text în germană cu `lang: en`): `language: 'unknown'`
  - `5053990101597` (Sour Cream & Onion): `traces` fără gunoiul `en:en:gluten  en:milk`
  - `6420106196515` (SanoVita): `ro:Ovaz` filtrat
  - `5941311003173` (Viva Chips): text prezent, `complete: false`
  - `5941355000688` (Lapte integral): `en:none` filtrat; `en:milk` doar la alergeni, nu și la urme
  - `5942016310139`: `product_not_found`
- [ ] Teste pe parsare: un text cu caracter de control în JSON → „date corupte”, nu excepție; `schema_version` 1003 → „date corupte”.
- [ ] `npm test`, `npx expo lint`, `npx tsc --noEmit` trec.
- [ ] **Pe iPhone** (Lica): un produs românesc din magazin își afișează numele; un cod valid inexistent arată „Product not found”; cu Wi-Fi-ul oprit arată eroarea de rețea, fără crash.

## Fișiere implicate

- `mobile/src/api/openFoodFacts.ts` (+ test pe parsare)
- `mobile/src/adapters/off.ts` (+ test pe fixtures), tipurile `NormalizedProduct`
- `mobile/src/app/product/[barcode].tsx`
- `mobile/src/strings.ts`

## Ce NU intră

- Backend-ul (`GET /api/products/{barcode}` vine la task-ul 07, fluxul complet).
- Nutriția, porția, aditivii, dieta (`ingredients_analysis_tags`, `labels_tags`): câmpurile se cer de la OFF, dar adaptorul nu le folosește încă.
- Discriminatorul, profilul, verdictul (task-ul 04).
- Cache, istoric, reîncercări automate.
- Detectarea limbii textului din conținut (euristici): textul fără `_ro` e `unknown`, punct.
- Axios sau alte biblioteci HTTP: `fetch`.

## Capcane

- Jest trebuie să poată importa `../fixtures/off/products.json` din afara `mobile/`. Dacă refuză, se ajustează configul jest; fixture-ul nu se copiază.
- Verifică pe iPhone că `User-Agent` chiar pleacă (React Native poate ignora unele header-e).
