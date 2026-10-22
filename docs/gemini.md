# Gemini

Gemini e folosit **doar ca cititor de etichete**: primește 1-3 poze, întoarce textul transcris în JSON. Nu primește profilul, nu evaluează produsul, nu dă sfaturi. Apelul se face **din backend** (cheia API stă acolo), niciodată din aplicație.

## Model și apel

| | Decizie |
|---|---|
| Model | **`gemini-3.8-flash`**, nivel gratuit (nu model local) |
| Apel | `models.generate_content` (stabil), **nu** Interactions API (beta, a avut breaking changes în mai 2026) |
| Configurare | `system_instruction` și `response_json_schema` ca parametri separați |
| Thinking | **low** |
| `temperature` | nu se setează (ignorat la Gemini 3.x) |
| Poze | redimensionate și comprimate în aplicație înainte de trimitere |
| Reîncercări | o singură reîncercare (poză la partea lipsă), apoi verdict „necunoscut” |

## Prompturi și scheme

Stau într-un singur loc: `backend/src/main/resources/gemini/`.

| Fișier | Rol | Stare |
|---|---|---|
| `prompt.txt` + `schema.json` | ingrediente | **înghețate**, nu se modifică |
| `prompt_nutritie.txt` + `schema_nutritie.json` | tabel nutrițional | pregătite, **netestate** |

Ingredientele și nutriția au prompt, schemă și endpoint separate.

### Schema ingrediente

Ordinea contează: `text_complet` e ultimul, ca modelul să judece după ce a transcris.

| Câmp | Ce conține |
|---|---|
| `are_sectiune_ingrediente` | false dacă în poze nu apare nicio listă |
| `limba` | codul limbii secțiunii alese (ro, en, de...) |
| `ingrediente_text` | exact ca pe etichetă, fără titlu, fără traducere; zonele necitite apar ca `[ilizibil]` |
| `poate_contine` | propoziția „Poate conține...”, separat |
| `traducere_ro` | doar dacă limba nu e ro / en |
| `alergeni_evidentiati` | ce e îngroșat / evidențiat pe etichetă |
| `zone_ilizibile` | unde nu s-a putut citi (ca să știi ce să refotografiezi) |
| `text_complet` | lista se vede cap-coadă și nu are `[ilizibil]` |

Fără scor de încredere: un procent dat de model e inventat, nu măsurat.

### Schema nutriție

`are_tabel_nutritional`, `coloana` (`100g` / `100ml` / `portie` / `lipsa`), `preparare` (`ca_vandut` / `preparat`), `portie_text`, `energie_kj`, `energie_kcal`, `grasimi`, `grasimi_saturate`, `glucide`, `zaharuri`, `fibre`, `proteine`, `sare`, `sodiu`, `zone_ilizibile`, `tabel_complet`.

Toate valorile vin ca **text** exact de pe etichetă („<0,5 g”). Parsarea, conversia sodiu → sare și alegerea valorilor se fac în adaptor (vezi [architecture.md](architecture.md#principii-nenegociabile)).

## Cum se folosește răspunsul

- **„Text complete?” îl decide aplicația**, nu Gemini: dacă textul conține `[ilizibil]` sau `zone_ilizibile` nu e goală, e incomplet, chiar dacă `text_complet` e true.
- Titlul „INGREDIENTE:” apare doar uneori → se scoate în adaptor.
- `alergeni_evidentiati` e **semnal secundar**; alergenii se verifică în cod, pe tot textul, cu sinonime.
- **Etichetă în limbă străină**: textul original rămâne în `ingrediente_text`, traducerea vine separat în `traducere_ro`. Pe traducere verdictul poate fi roșu / galben, **niciodată verde** (vezi [discriminator.md](discriminator.md)).
- **Userul vede textul citit și îl confirmă** (îl poate corecta) înainte de `POST /api/products`.

## Faza 0: test Gemini

**Setup** (`tools/test-gemini/test_gemini.py`): rulează fiecare produs de 2 ori și salvează în `fixtures/gemini/`. Citește prompturile și schemele direct din `backend/src/main/resources/gemini/`. `--tip nutritie` pentru tabel, `--cod <cod|inventat>` pentru testul pe cod de bare. Pozele în `tools/test-gemini/poze/<produs>/` și `poze_nutritie/<produs>/` (HEIC de pe iPhone merge direct; nu intră în repo). Cheia din `GEMINI_API_KEY`.

**Rezultate** (poze făcute intenționat prost, deci rezultatele sunt o limită inferioară):

| Situație | Produs | Rezultat |
|---|---|---|
| listă normală în română | suc, porumb, cereale, chips | ingrediente corecte, identice între rulări |
| alergeni îngroșați | cereale, chips | prinși în `alergeni_evidentiati`, dar nu complet (la chips lipsește „lapte praf”) |
| limbă străină | cappuccino (poloneză) | text păstrat în poloneză, traducere corectă („Mleko” → „Lapte”) |
| listă tăiată (curbura cutiei) | Pringles | `text_complet: false`, `[ilizibil]` la capete, **nimic inventat**; „{lapte}” prins în ambele rulări |
| poză fără listă | cappuccino (fața) | `are_sectiune_ingrediente: false`, corect |
| Snickers | Snickers | `are_sectiune_ingrediente: false` în ambele rulări (probabil poza nu conținea lista) |

### Lecții → reguli

1. **Gemini recunoaște ce nu vede**: pune `[ilizibil]` în loc să inventeze. Aplicația nu are totuși încredere oarbă în `text_complet` (vezi mai sus).
2. Pe imagini grele, rulările diferă la margini („acid malic” vs „acid ma[ilizibil]”) → userul vede și confirmă textul.
3. `alergeni_evidentiati` e semnal secundar.
4. Titlul listei apare doar uneori → se scoate în adaptor.
5. Diacriticele pot lipsi („apa”, „lamaie”) → nu contează, textul se normalizează oricum.
6. **Timpi: 7-125 s** cu thinking medium (rulările din `fixtures/gemini/`), mult mai mari la pozele grele. Prea mult pentru magazin → thinking low + poze redimensionate și comprimate din aplicație. Comparația low vs medium nu s-a făcut (s-a terminat limita gratuită).

### Nefăcut

- Pringles cu 2 poze (combinarea pozelor), testul pe cod de bare, timpii cu thinking low (opționale).
- **Testul de nutriție**: se face **înainte** de modulele de diabet / hipertensiune. Cifrele greșesc altfel decât cuvintele („5 g” în loc de „0,5 g” arată credibil), iar alegerea coloanei e o logică nouă. De urmărit: alegerea coloanei (100 g / porție / preparat), valori cu „<”, tabel tăiat.

## Întrebări deschise

- Termenii nivelului gratuit Gemini API pentru datele trimise (pot fi folosite pentru antrenare?)
- Dacă `gemini-3.8-flash` rămâne pe nivelul gratuit
