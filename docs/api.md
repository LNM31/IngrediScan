# Contractul API (mobile ↔ backend)

> **Stare: aprobat (2026-10-24).** Singura parte provizorie e forma lui `nutrition`, care se fixează după testul de nutriție.

Ăsta e singurul punct de contact dintre aplicație și backend. Sesiunile de mobile și de backend nu se văd între ele, deci **ce nu e aici nu există**: nu se inventează endpoint-uri, câmpuri sau coduri de eroare. O schimbare de contract se face întâi aici, apoi în cod, în ambele părți.

Open Food Facts nu e în contract: aplicația îl apelează direct (vezi [open-food-facts.md](open-food-facts.md)).

## Convenții generale

| | |
|---|---|
| Bază | `http://<ip-laptop>:8080/api` (în aplicație: `EXPO_PUBLIC_API_URL`) |
| Format | JSON, UTF-8 (diacriticele trec neschimbate) |
| Nume câmpuri | engleză, `camelCase` |
| Lipsă | `null` (nu `""`, nu câmp omis), cu excepția răspunsului de la `/labels`, vezi mai jos |
| Date | ISO 8601 în UTC, cu `Z`: `"2026-10-23T14:05:00Z"`; setate doar de server |
| Câmpuri necunoscute în request | ignorate |
| Codul de bare | **string**, exact 13 cifre, cifra de control EAN-13 validă. Niciodată număr (s-ar pierde zerourile de la început) |

### Autentificare

Toate cererile către `/api/**` trimit:

```
X-Api-Token: <token>
```

- Backend: `API_TOKEN` în `backend/.env`. Aplicația: `EXPO_PUBLIC_API_TOKEN` în `mobile/.env`. Niciunul nu intră în git.
- Token lipsă sau greșit → `401 UNAUTHORIZED`.
- **Nu e un secret real**: orice valoare `EXPO_PUBLIC_*` ajunge în bundle-ul aplicației. Token-ul doar ține deoparte traficul întâmplător la demo. Cheia Gemini, în schimb, e secret real și nu iese din backend.

## Erori

Format unic **RFC 9457 (Problem Details)**, pe care Spring îl are deja (`ProblemDetail`), cu un câmp în plus, `code`. Un singur `@RestControllerAdvice` produce toate erorile. `Content-Type: application/problem+json`.

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "No product with barcode 5941143028337",
  "instance": "/api/products/5941143028337",
  "code": "PRODUCT_NOT_FOUND"
}
```

La `VALIDATION_FAILED` apare și `errors`:

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Request validation failed",
  "instance": "/api/products",
  "code": "VALIDATION_FAILED",
  "errors": [
    { "field": "ingredientsText", "message": "must not be blank" }
  ]
}
```

- **Aplicația decide doar după `code`.** `detail` e pentru log-uri și nu se afișează userului; textele UI stau în fișierul de texte al aplicației.
- Niciun răspuns de eroare nu conține stack trace, mesajul brut de la Gemini sau cheia API.

| `code` | Status | Când |
|---|---|---|
| `UNAUTHORIZED` | 401 | `X-Api-Token` lipsă sau greșit |
| `INVALID_BARCODE` | 400 | codul din URL sau din body nu are 13 cifre sau cifra de control e greșită |
| `VALIDATION_FAILED` | 400 | body-ul nu respectă regulile de validare (cu `errors[]`) |
| `MALFORMED_REQUEST` | 400 | JSON invalid, tip greșit de câmp |
| `PRODUCT_NOT_FOUND` | 404 | nu există produs cu codul ăsta |
| `PRODUCT_ALREADY_EXISTS` | 409 | `POST` pe un cod care există deja |
| `INVALID_PHOTOS` | 400 | 0 poze sau mai mult de 3 |
| `PAYLOAD_TOO_LARGE` | 413 | o poză peste limită sau cererea peste limită |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | poză care nu e JPEG |
| `AI_BAD_RESPONSE` | 502 | Gemini a răspuns, dar JSON-ul nu respectă schema |
| `AI_UNAVAILABLE` | 503 | Gemini picat, limită de cereri / cotă depășită |
| `AI_TIMEOUT` | 504 | Gemini nu a răspuns în timp |
| `NOT_FOUND` | 404 | ruta nu există (ex. `/api/produse`) |
| `METHOD_NOT_ALLOWED` | 405 | metodă nesuportată pe o rută existentă (ex. `PATCH /api/products/{barcode}`) |
| `INTERNAL_ERROR` | 500 | orice altceva |

Pentru aplicație, **orice 5xx de la `/labels` înseamnă „Gemini available? → No”** din diagramă (→ „Unknown, check the label”). Codurile separate există pentru log-uri și pentru un mesaj mai precis.

## Produse

### Resursa `Product`

```json
{
  "barcode": "5941143028337",
  "name": "Franzeluță albă",
  "brand": "Vel Pitar",
  "quantity": "150 g",
  "imageUrl": "https://images.openfoodfacts.net/images/products/594/114/302/8337/front_ro.3.200.jpg",
  "ingredientsText": "Făină albă de grâu 650, apă, drojdie, sare iodată, gluten din grâu, emulsifiant (...), conservanți (acid sorbic, propionat de calciu), agent de tratare a făinii (acid ascorbic).",
  "mayContainText": "Poate conține urme de soia.",
  "ingredientsLanguage": "ro",
  "ingredientsTranslationRo": null,
  "ingredientsSource": "ai",
  "nutrition": {
    "basis": "100g",
    "preparation": "as_sold",
    "servingText": null,
    "energyKj": 1109.5,
    "energyKcal": 262,
    "fat": 1.3,
    "saturatedFat": 0.3,
    "carbohydrates": 50.6,
    "sugars": 3.5,
    "fiber": 3.9,
    "protein": 10,
    "salt": 1.3
  },
  "nutritionSource": "off",
  "createdAt": "2026-10-23T14:05:00Z",
  "updatedAt": "2026-10-23T14:05:00Z"
}
```

| Câmp | Tip | Obligatoriu în request | Note |
|---|---|---|---|
| `barcode` | string | doar la `POST` | 13 cifre, EAN-13 valid. La `PUT` vine din URL |
| `name`, `brand` | string \| null | nu | din OFF dacă există; altfel userul îl poate scrie la confirmare |
| `quantity` | string \| null | nu | text ca în OFF („150 g”), doar pentru afișare |
| `imageUrl` | string \| null | nu | URL-ul pozei din OFF, doar pentru afișare. Backend-ul nu stochează poze |
| `ingredientsText` | string | **da** | textul confirmat de user, exact ca pe etichetă, fără titlul „Ingrediente:”, fără „Poate conține” |
| `mayContainText` | string \| null | nu | propoziția „Poate conține...”, separat |
| `ingredientsLanguage` | string | **da** | cod ISO 639-1 (`ro`, `en`, `de`, `pl`...) |
| `ingredientsTranslationRo` | string \| null | doar dacă limba nu e `ro` / `en` | traducerea AI. Pe ea verdictul nu poate fi verde |
| `ingredientsSource` | `"ai"` \| `"user"` | **da** | `ai` = citit din poză și confirmat neschimbat; `user` = userul a editat textul |
| `nutrition` | object \| null | nu | vezi mai jos |
| `nutritionSource` | `"off"` \| `"ai"` \| `"user"` \| null | da, dacă `nutrition` ≠ null | |
| `createdAt`, `updatedAt` | string | nu (ignorate) | setate de server |

Față de entitatea din documentele vechi:
- `source` (unul singur) devine **`ingredientsSource` + `nutritionSource`**. Un produs salvat după poză are de obicei ingredientele de la AI și nutriția din OFF („Merge with OFF data + save”), deci o singură sursă ar minți pentru una dintre părți.
- `confirmed` **dispare**: la laborator se face `POST` doar după confirmarea userului, deci ar fi mereu `true`. Confirmările de la mai mulți useri sunt la licență.
- `quantity` și `imageUrl` sunt **noi**: wireframe-ul de rezultat le afișează, iar la a doua scanare produsul vine din baza noastră, nu din OFF.

**Validare** (`POST` și `PUT`):
- `ingredientsText` negol, maximum 5000 de caractere.
- `ingredientsText` **nu poate conține `[ilizibil]`** → `VALIDATION_FAILED`. Baza proprie se verifică înaintea OFF la fiecare scanare, deci trebuie să conțină doar liste complete. Dacă userul nu poate completa textul, produsul nu se salvează și fluxul ajunge la „Unknown, check the label”.
- `ingredientsTranslationRo` obligatoriu dacă `ingredientsLanguage` nu e `ro` / `en`, și `null` altfel.

#### `nutrition`

> **Provizoriu.** Forma se fixează după testul de nutriție (vezi [gemini.md](gemini.md#nefăcut)). Până atunci câmpul există, ca să nu se piardă nutriția din OFF la salvare, dar nimic din lab-ul obligatoriu nu depinde de el.

| Câmp | Tip | Note |
|---|---|---|
| `basis` | `"100g"` \| `"100ml"` | valorile sunt **mereu** la 100 g / 100 ml. Un tabel doar pe porție nu se salvează ca nutriție |
| `preparation` | `"as_sold"` \| `"prepared"` | |
| `servingText` | string \| null | porția exact ca pe etichetă („1 biscuit (12,5 g)”) |
| `energyKj`, `energyKcal` | number \| null | |
| `fat`, `saturatedFat`, `carbohydrates`, `sugars`, `fiber`, `protein`, `salt` | number \| null | grame la `basis` |

Valorile sunt **numere deja interpretate** de adaptorul din aplicație (AI-ul transcrie, codul interpretează): `"<0,5 g"` → `0.5`, sodiu → sare ×2,5. Backend-ul doar le stochează. Sodiul nu are câmp separat: dacă eticheta are doar sodiu, adaptorul calculează `salt`.

### `GET /api/products/{barcode}`

Se apelează la fiecare scanare, înainte de OFF.

| Răspuns | Când |
|---|---|
| `200` + `Product` | există |
| `404 PRODUCT_NOT_FOUND` | nu există → aplicația merge la OFF |
| `400 INVALID_BARCODE` | cod invalid |

### `POST /api/products`

Userul a confirmat lista citită din poză. Body: `Product` fără `createdAt` / `updatedAt`.

| Răspuns | Când |
|---|---|
| `201` + `Product` + header `Location: /api/products/{barcode}` | creat |
| `409 PRODUCT_ALREADY_EXISTS` | există deja → aplicația face `PUT` dacă userul vrea să-l înlocuiască |
| `400 INVALID_BARCODE` / `VALIDATION_FAILED` | |

### `PUT /api/products/{barcode}`

Userul corectează un produs. **Înlocuiește tot** (nu e patch): body-ul e `Product` fără `barcode`, `createdAt`, `updatedAt`. Un câmp lipsă sau `null` în body devine `null`.

| Răspuns | Când |
|---|---|
| `200` + `Product` | actualizat |
| `404 PRODUCT_NOT_FOUND` | nu există (`PUT` nu creează) |
| `400 INVALID_BARCODE` / `VALIDATION_FAILED` | |

### `DELETE /api/products/{barcode}`

Userul șterge un produs adăugat greșit.

| Răspuns | Când |
|---|---|
| `204`, fără body | șters |
| `404 PRODUCT_NOT_FOUND` | nu există |

Nu există `GET /api/products` (listă): aplicația nu are niciun ecran care să-l folosească. Dacă profesorul vrea să vadă lista la demo, se adaugă atunci, cu paginare.

## Etichete (Gemini)

### `POST /api/labels/ingredients`

Aplicația trimite 1-3 poze cu ambalajul **aceluiași** produs; backend-ul le trimite la Gemini cu `prompt.txt` + `schema.json` și întoarce ce a citit. **Nu salvează nimic** și nu primește codul de bare sau profilul.

Request: `multipart/form-data`, câmpul `photos` repetat de 1-3 ori.

| Regulă | Valoare inițială | Motiv |
|---|---|---|
| Format | `image/jpeg` | aplicația convertește (HEIC de pe iPhone inclus) |
| Latura mare | ≤ 1600 px, redimensionată în aplicație | timpii Gemini (5-40 s cu thinking medium) |
| Mărime | ≤ 2 MB / poză, ≤ 6 MB / cerere | |

Multipart în loc de base64 în JSON: base64 umflă pozele cu ~33%, iar Spring și `fetch` din React Native știu multipart direct.

Răspuns `200`: **backend-ul mapează câmpurile Gemini în engleză**. Schema Gemini (în română) e un detaliu intern al backend-ului, la fel ca promptul; aplicația nu trebuie să se schimbe dacă se schimbă promptul.

```json
{
  "hasIngredientsSection": true,
  "language": "ro",
  "ingredientsText": "făină integrală de GRÂU (36,9 %), făină de orez (29,5 %), zahăr, ulei de floarea - soarelui, ...",
  "mayContainText": "Poate conține LAPTE și FRUCTE CU COAJĂ LEMNOASĂ.",
  "translationRo": "",
  "highlightedAllergens": ["GRÂU", "LAPTE", "FRUCTE CU COAJĂ LEMNOASĂ"],
  "unreadableAreas": [],
  "textComplete": true
}
```

| Câmp | Din schema Gemini |
|---|---|
| `hasIngredientsSection` | `are_sectiune_ingrediente` |
| `language` | `limba` |
| `ingredientsText` | `ingrediente_text` |
| `mayContainText` | `poate_contine` |
| `translationRo` | `traducere_ro` |
| `highlightedAllergens` | `alergeni_evidentiati` |
| `unreadableAreas` | `zone_ilizibile` |
| `textComplete` | `text_complet` |

- **Excepție de la regula cu `null`:** aici toate câmpurile sunt mereu prezente, iar `""` / `[]` înseamnă „lipsă”, exact cum le dă Gemini. Backend-ul nu interpretează nimic.
- Backend-ul **nu** scoate titlul „Ingrediente:” și **nu** decide dacă textul e complet. Le face aplicația (vezi [gemini.md](gemini.md#cum-se-folosește-răspunsul)).
- Răspunsul ăsta nu e un `Product`. Aplicația îl arată userului pentru confirmare, îl combină cu datele din OFF și abia apoi face `POST /api/products`.

Erori: `INVALID_PHOTOS`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `AI_BAD_RESPONSE`, `AI_UNAVAILABLE`, `AI_TIMEOUT`.

**Timpi:**
- backend → Gemini: timeout **60 s**, **fără reîncercări automate** (dublează timpul și consumă cota; singura reîncercare din flux e poza la partea lipsă, decisă de user).
- aplicație → backend: timeout **70 s** (mai mare decât al backend-ului, ca aplicația să primească `AI_TIMEOUT`, nu o eroare de rețea), cu indicator de progres și buton de anulare.
- Confirmate de testul 2: cel mai lent caz măsurat a fost 37,6 s (poză grea, thinking medium).

### `POST /api/labels/nutrition` (rezervat)

Numele e rezervat pentru tabelul nutrițional (`prompt_nutritie.txt` + `schema_nutritie.json`). **Nu se implementează** până după testul de nutriție; contractul se scrie atunci.

## Configurare

| Unde | Variabilă | Ce |
|---|---|---|
| `backend/.env` | `API_TOKEN` | token-ul așteptat în `X-Api-Token` |
| `backend/.env` | `GEMINI_API_KEY` | cheia Gemini, fără valoare implicită |
| `mobile/.env` | `EXPO_PUBLIC_API_URL` | ex. `http://192.168.1.20:8080/api` (IP-ul laptopului în rețea sau Tailscale) |
| `mobile/.env` | `EXPO_PUBLIC_API_TOKEN` | aceeași valoare ca `API_TOKEN` |

## Întrebări deschise

- **EAN-8**: produsele mici au uneori coduri cu 8 cifre, pe care camera le poate citi. Acum contractul acceptă doar EAN-13 (decizia inițială). Se extinde doar dacă apare un produs real cu EAN-8 în test.
- Limitele pentru poze și timeout-urile se ajustează dacă timpii reali din aplicație ies mult peste cei din testul 2.
