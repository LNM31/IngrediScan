# Gemini

Gemini e folosit **doar ca cititor de etichete**: primește 1-3 poze, întoarce textul transcris în JSON. Nu primește profilul, nu evaluează produsul, nu dă sfaturi. Apelul se face **din backend** (cheia API stă acolo), niciodată din aplicație.

## Model și apel

| | Decizie |
|---|---|
| Model | **`gemini-3.6-flash`**, nivel gratuit (nu model local). Ales în [testul 2](#testul-2-2026-10-24-gemini-36-flash); `gemini-3.8-flash` a fost lent și supraîncărcat. Numele modelului e configurabil în backend |
| Apel | `models.generate_content` (stabil), **nu** Interactions API (beta, a avut breaking changes în mai 2026) |
| Configurare | `system_instruction` și `response_json_schema` ca parametri separați |
| Thinking | **medium** (cu low, 3.6 a inventat text pe lista tăiată) |
| `temperature` | nu se setează (ignorat la Gemini 3.x) |
| Poze | redimensionate și comprimate în aplicație înainte de trimitere |
| Reîncercări | o singură reîncercare (poză la partea lipsă), apoi verdict „necunoscut” |

## Prompturi și scheme

Stau într-un singur loc: `backend/src/main/resources/gemini/`.

| Fișier | Rol | Stare |
|---|---|---|
| `prompt.txt` + `schema.json` | ingrediente | **înghețate**, nu se modifică |
| `prompt_nutritie.txt` + `schema_nutritie.json` | tabel nutrițional | testate pe tabele simple (testul 2); cazurile riscante netestate |

Ingredientele și nutriția au prompt, schemă și endpoint separate.

Schemele (cu chei în română) sunt interne backend-ului. Backend-ul redenumește cheile în engleză înainte să răspundă aplicației (`ingrediente_text` → `ingredientsText` etc.; tabelul complet e în [api.md](api.md#post-apilabelsingredients)). Conținutul nu se traduce și nu se interpretează: textul rămâne în limba etichetei.

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
| limbă străină | cappuccino (poloneză), folderul `capp` | text păstrat în poloneză, traducere corectă („Mleko” → „Lapte”) |
| listă tăiată (curbura cutiei) | Pringles | `text_complet: false`, `[ilizibil]` la capete, **nimic inventat**; „{lapte}” prins în ambele rulări |
| poză fără listă | cappuccino (fața), folderul `cappuccino` | fără text, `text_complet: false`, corect |
| Snickers | Snickers | `are_sectiune_ingrediente: false` în ambele rulări (probabil poza nu conținea lista) |

### Lecții → reguli

1. **Gemini recunoaște ce nu vede**: pune `[ilizibil]` în loc să inventeze. Aplicația nu are totuși încredere oarbă în `text_complet` (vezi mai sus).
2. Pe imagini grele, rulările diferă la margini („acid malic” vs „acid ma[ilizibil]”) → userul vede și confirmă textul.
3. `alergeni_evidentiati` e semnal secundar.
4. Titlul listei apare doar uneori → se scoate în adaptor.
5. Diacriticele pot lipsi („apa”, „lamaie”) → nu contează, textul se normalizează oricum.
6. **Timpi: 7-125 s** cu thinking medium (rulările din `fixtures/gemini/` fără prefix de tip), mult mai mari la pozele grele. Prea mult pentru magazin → thinking low + poze redimensionate și comprimate din aplicație.

## Testul 2 (2026-10-24): `gemini-3.6-flash`

Rezultatele sunt în `fixtures/gemini/{ingrediente,nutritie}_<produs>[_<model>]_<thinking>_run<N>.json` (modelul apare în nume doar la rulările făcute după ce a fost adăugat în script). Motivul testului: `gemini-3.8-flash` a răspuns o dată în 69 s, apoi a dat „model is currently experiencing high demand” (supraîncărcare pe partea Google, nu cota contului).

### Ingrediente, thinking low

| Produs | Timp | Rezultat |
|---|---|---|
| ciocolata_neagra (nou) | 5-6 s | corect, identic între rulări; „poate conține” separat. Fixture bun pentru discriminator: „unt de cacao” (excepție, nu e lapte) + urme de lapte |
| cereale | 6-7 s | corect, identic cu 3.8 |
| snickers | 4-10 s | `are_sectiune_ingrediente: false`, ca la 3.8 |
| cappuccino (fața) | 8-11 s | `[ilizibil]`, `text_complet: false`: sigur, dar `limba` diferă între rulări (`ro` / `pl`) |
| **pringles** (listă tăiată) | 5 s | **`text_complet: true`, fără `[ilizibil]`, listă „completă”** pe aceeași poză unde 3.8 vedea rândurile tăiate. Textul nu se potrivește cu ce se vede: unde 3.8 citea „acid ma[ilizibil]”, 3.6 scrie „acid lactic”. **Modelul a completat lista din ce „știe” despre Pringles** |
**Lecție:** pe 3.6 cu thinking low, `text_complet` și lipsa `[ilizibil]` **nu garantează** că textul a fost citit. Regula din aplicație („text complete” decis din `[ilizibil]` și `zone_ilizibile`) nu prinde cazul ăsta, pentru că modelul nu semnalează nimic. Rămâne doar confirmarea userului, iar un text inventat plauzibil trece ușor de ea. **De aceea thinking low e respins.**

### Ingrediente, thinking medium

O singură rulare reușită per produs (cealaltă a picat).

| Produs | Timp | Rezultat |
|---|---|---|
| **pringles** (listă tăiată) | **37,6 s** (6927 tokeni de gândire) | `text_complet: false`, `[ilizibil]` în 3 locuri, `zone_ilizibile` descrise („text tăiat de curbura ambalajului”). Corect semnalat |
| capp (poloneză) | 19,6 s | text păstrat în poloneză, `limba: pl`, `text_complet: true`, traducere corectă, ca la 3.8 |

**Atenție:** și cu medium, pe Pringles, porțiunile dintre `[ilizibil]` conțin lucruri pe care 3.8 nu le-a văzut („acid citric, acid lactic, acid malic”, unde 3.8 citea „acid ma[ilizibil]”; „ceapă pudră, dextroză” repetat). Probabil sunt tot completări din ce „știe” modelul. Rezultatul rămâne **sigur**, pentru că textul e marcat incomplet: nu se salvează (`[ilizibil]` e respins la `POST`), nu poate da verde, iar un alergen inventat poate da cel mult o alarmă falsă (roșu), adică greșeala în direcția sigură.

### Nutriție, thinking low

6 produse (5togo, biscuiti_milka, ceva_biscuiti, ciocolata_neagra, malai, mango_cookies), câte 2 rulări:
- **valori identice între rulări** la toate; timpi **4,8-12,9 s**;
- **energia calculată** din macronutrienți (grăsimi ×9, glucide ×4, proteine ×4, fibre ×2) se potrivește cu energia de pe etichetă la 5 din 6. La ceva_biscuiti diferă cu ~6% (454 vs 430 kcal), dar valorile au fost verificate pe ambalaj și sunt corecte: rotunjire pe etichetă, nu greșeală de citire. Verificarea energiei e totuși un semnal util pentru adaptor (diferență mare → userul verifică valorile);
- formatul e transcris exact și variază: `1802kJ`, `343 Kcal`, `0,88g`, `<0,5g`, porție `2 Stk/шт./ks (19 g/г)` → parserul trebuie să accepte spațiu opțional, unități fără diferență de majuscule, virgulă zecimală, `<` și porții în mai multe limbi;
- toate 6 tabelele au fost **simple** (100 g, ca vândut, complete). **Netestate:** tabel doar pe porție, „preparat”, tabel tăiat, sodiu. Se testează la task-ul de nutriție, cu poze alese pentru ele.

### Nefăcut

- **Timpii cu medium pe etichete obișnuite** și a doua rulare pe Pringles cu medium: se măsoară la task-ul de backend pentru `/api/labels/ingredients`. Testul de nutriție a rulat cu low; la task-ul de nutriție se refac rulările cu medium.
- Pringles cu 2 poze (combinarea pozelor), testul pe cod de bare (opționale).
- Nutriție: cazurile riscante de mai sus, înainte de `POST /api/labels/nutrition` și de modulele de diabet / hipertensiune. Pot schimba forma lui `nutrition` din [api.md](api.md).

## Întrebări deschise

- Dacă timpii cu medium (20-40 s pe pozele grele) sunt acceptabili în magazin, sau trebuie poze mai mici / alt model
- Termenii nivelului gratuit Gemini API pentru datele trimise (pot fi folosite pentru antrenare?)
- Dacă modelul ales rămâne pe nivelul gratuit și până când (modelele mai vechi se retrag mai repede)
