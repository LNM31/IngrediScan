# Open Food Facts

Aplicația mobilă apelează OFF **direct** (limitele OFF sunt pe IP, deci nu trec prin backend). Se folosește **doar API v3.6**, cu versiunea fixată în URL (v2 e deprecated).

## Endpoint

```
GET https://world.openfoodfacts.org/api/v3.6/product/{barcode}?fields=...
```

- Răspunsul are `result.id` (`product_found` / `product_not_found`) și `schema_version` = 1004.
- Trebuie trimis un `User-Agent` cu numele aplicației; există limite de cereri.

## Câmpurile cerute (lista finală)

```
fields=product_name,product_name_ro,brands,quantity,image_front_small_url,lang,states_tags,no_nutrition_data,ingredients_text,ingredients_text_ro,ingredients,allergens_tags,traces_tags,additives_tags,ingredients_analysis_tags,labels_tags,nutrition,schema_version
```

| Câmp | La ce folosește |
|---|---|
| `product_name(_ro)`, `brands`, `quantity`, `image_front_small_url` | afișare |
| `states_tags`, `no_nutrition_data` | completitudine (`en:ingredients-completed`) → decizia de fallback |
| `ingredients_text_ro`, `ingredients_text` | textul pe care rulează verificarea proprie |
| `allergens_tags`, `traces_tags` | al doilea semnal pentru alergeni / urme |
| `ingredients_analysis_tags`, `labels_tags` | dietă, confirmări pozitive (`en:gluten-free`, `en:no-lactose`) |
| `additives_tags` | aditivi (aspartam la fenilcetonurie, fosfați) + explicații |
| `ingredients` | doar pentru UI, are gunoi |
| `nutrition` | `aggregated_set`: valori normalizate la 100 g / 100 ml |
| `schema_version` | assert că primesc 1004 |

**Scoase intenționat:** `nova_group`, `nutriscore_grade` (scoruri generale, nu personalizate), `nutrient_levels` (nivelurile le calculează discriminatorul).

## Ce contează în v3.6

- `*_hierarchy` a dispărut pentru câmpurile de taxonomie editabile; `*_tags` conțin forma canonică + părinții.
- Nutriția: `nutrition.aggregated_set` cu `per` (`100g` / `100ml`), `preparation` (`as_sold` / `prepared`) și la fiecare nutrient `{ value, unit, source }`. Surse în ordinea priorității: manufacturer, packaging, usda, estimate.

## Porția

La un test, informația de porție a apărut în `quantity`. Atenție: `quantity` e cantitatea **ambalajului** (ex: „330 ml”), deci e egală cu porția doar la produse individuale (doză, baton). La o sticlă de 2 L sau o cutie de 400 g nu e porție. În plus, `quantity` e text murdar („375” fără unitate, „400 g,”).

De verificat pe mai multe produse dacă v3.6 are și `serving_size` / `serving_quantity` / `product_quantity`. Dacă nu există porție sigură, se afișează doar valorile la 100 g / 100 ml. Pentru produsele fotografiate, promptul de nutriție întoarce `portie_text` exact ca pe etichetă (vezi [gemini.md](gemini.md)).

## Alergenii din profil → tag-uri OFF

```
en:gluten, en:milk, en:eggs, en:peanuts, en:soybeans, en:nuts, en:fish, en:crustaceans,
en:molluscs, en:celery, en:mustard, en:sesame-seeds, en:sulphur-dioxide-and-sulphites, en:lupin
```

## Faza 0: test pe 19 produse reale

Răspunsurile brute sunt în `fixtures/off/products.json`. Se folosesc ca teste pentru adaptor și ca backup offline la demo.

**Cifre:** 17/19 găsite (unul avea 14 cifre, probabil tastat greșit), 11/17 cu ingrediente complete, doar 6/17 cu text în română, 15/17 cu nutriție. **Doar ~9/19 pot fi evaluate sigur fără poză**, deci fallback-ul pe poză e cam jumătate din scanări.

### Lecții → reguli

1. **`allergens_tags` gol ≠ fără alergeni** (Snickers). Lista contează doar cu `en:ingredients-completed`.
2. **Nici „complet” nu e suficient**: Cappuccino Starbucks are text în germană, lapte nedetectat. Text în altă limbă decât ro / en → nesigur. `lang` nu e de încredere (Cappuccino: `lang: en`, text german; Sour Cream & Onion: `lang: ro`, text englez). Deci: doar `ingredients_text_ro` contează ca `ro`; `ingredients_text` are limba `unknown` (vezi `decizii.md`, 2026-10-24).
3. **Tag-urile se filtrează pe listă albă** (`en:none`, `ro:Ovaz`, caractere de control la Pringles). Alergen și în alergeni, și în urme → câștigă alergenul.
4. **Doar nutrienții de bază, preferabil din `packaging`** (estimări absurde, zerouri puse de contributori, `fiber` lipsește uneori).
5. **Fallback pe bucăți**: dacă lipsesc doar ingredientele, nutriția din OFF se păstrează.
6. **Textul brut e pentru căutare**; `ingredients[]` are instrucțiuni de păstrare, OCR stricat.
7. **Nume și cantitate doar pentru afișare.**

### Tehnic

- Parsare JSON în `try/catch`: caracterele de control pot rupe `response.json()`. Eroarea se tratează ca „date corupte → poză”.
- Codurile tastate se validează (lungime + cifră de control EAN-13).
