# 04 · Profil (alergeni) + discriminator + ecranul de rezultat

**Parte:** mobile · **Depinde de:** 02 · **Stare:** ⏳

## Scop

Userul își bifează alergiile, scanează un produs și primește verdictul **pentru el**: roșu / verde / necunoscut, cu motivul și sursa. Prima felie care merge cap-coadă: scanare → OFF → discriminator → rezultat. Doar cei 14 alergeni; dieta și afecțiunile vin ca module mai târziu, în același motor.

## De citit întâi

- `docs/discriminator.md` (tot)
- `docs/open-food-facts.md`, „Lecții → reguli”
- `docs/architecture.md`, „Ecrane” + wireframe-ul `docs/wireframes/wireframe_rezultat_v1.png`
- `mobile/CLAUDE.md`

## Ce se face

1. **Discriminatorul** (`src/discriminator/`, fără importuri din React / Expo / rețea):
   - tipuri: `Level` (`red` / `yellow` / `green` / `unknown`), `Rule` (`{ type, target, threshold?, level, source }`), `Finding` (`{ level, code, params, source }`: motivul e un **cod + parametri**, textul afișat vine din fișierul de texte UI);
   - **registrul de module**: 14 module de alergeni, id-uri `allergy:gluten`, `allergy:milk`, `allergy:eggs`, `allergy:peanuts`, `allergy:nuts`, `allergy:soy`, `allergy:fish`, `allergy:crustaceans`, `allergy:molluscs`, `allergy:celery`, `allergy:mustard`, `allergy:sesame`, `allergy:sulphites`, `allergy:lupin`; fiecare cu regula lui, sursa „Regulation (EU) No 1169/2011, Annex II”, tag-ul OFF corespunzător și lista de **sinonime în română și engleză**;
   - **excepții** per alergen (cel puțin: „unt de cacao”, „unt de arahide”, „lapte de cocos”, „lapte de soia”, „lapte de migdale”, „lapte de ovăz”, „cocoa butter”, „peanut butter”, „coconut milk” nu sunt lapte);
   - `evaluate(product: NormalizedProduct, moduleIds: string[]): { level, findings }`.
2. **Regulile de evaluare** (din `discriminator.md`):
   - text normalizat: litere mici, fără diacritice (inclusiv **ambele** variante: ș/ş, ț/ţ), căutare la limită de cuvânt (atenție: `\b` din JS nu merge corect cu litere non-ASCII, deci normalizarea se face înainte);
   - textul se împarte la „poate conține” / „poate contine” / „may contain”: ce e după e **urmă**;
   - alergen găsit în ingrediente sau în urme → **roșu** (orice urmă contează), cu `code` diferit pentru urme;
   - tag-urile OFF (`offTags`) sunt semnal secundar: un tag găsit dă tot **roșu**, chiar dacă textul lipsește;
   - **roșu → necunoscut → verde**: fără roșu, verdictul e **necunoscut** dacă `ingredients` e `null`, `complete` e `false` sau `language` nu e `ro` / `en` (inclusiv `unknown` și textul tradus de AI); altfel **verde**;
   - galben nu apare încă (nu există reguli pe cantitate la alergeni).
3. **Profilul** (`src/storage/`): `{ version: 1, modules: string[] }` în `expo-secure-store`. La încărcare, **id-urile necunoscute se ignoră** (un modul scos nu strică profilul).
4. **Ecranul de profil**: lista celor 14 alergeni cu bifă, salvare imediată. Accesibil din Home.
5. **Ecranul de rezultat**, după wireframe:
   - poză + nume + brand / cantitate (din task-ul 02);
   - **verdictul: culoare + iconiță + text**, niciodată doar culoare;
   - motivul (prima constatare, apoi lista celorlalte), cu sursa;
   - textul ingredientelor cu termenii care au declanșat regula **evidențiați** în text (nu listă de ingrediente separate, vezi „Ce nu intră”);
   - disclaimer: „Information, not medical advice.”;
   - „Scan another”.
   - Profil gol → în loc de verdict: „Set up your profile to get a verdict” + buton spre profil.
   - Necunoscut: textul spune de ce (fără ingrediente / listă incompletă / limbă nesigură). Butonul „Suggest AI” **nu** intră încă.

## Criterii de acceptare

- [ ] Teste pe `evaluate` care folosesc adaptorul din task-ul 02 pe `fixtures/off/products.json`, cel puțin:
  - Franzeluță (`5941143028337`): `allergy:gluten` → roșu; `allergy:soy` → roșu (urme); `allergy:milk` → verde
  - Lapte integral (`5941355000688`): `allergy:milk` → roșu
  - Snickers (`5900951310959`): orice alergen → necunoscut
  - Cappuccino (`5711953078798`, „TRINKMILCH”, limbă `unknown`): `allergy:milk` → **necunoscut, nu verde**
  - Viva Chips (`5941311003173`, incomplet): `allergy:milk` → roșu (găsit în date parțiale); `allergy:celery` → necunoscut
  - Choco Brownie (`7622210652775`): `allergy:sesame` → roșu (urme)
  - Peanut Butter (`5941882806135`, „Alune de pământ (arahide) 90%, ulei de alune”): `allergy:peanuts` → roșu; `allergy:nuts` → roșu din cauza lui „ulei de alune” (ambiguu: „alune” înseamnă de obicei alune de pădure). E o alarmă falsă acceptată, în direcția sigură; „alune de pământ” singur nu trebuie să declanșeze `allergy:nuts`
- [ ] Teste pe reguli, pe texte scrise în test: fiecare excepție de mai sus; diacritice lipsă și ambele variante de ș / ț; „poate contine urme de soia” fără diacritice; capcane de limită de cuvânt: „untură” nu e „unt” (lapte), „nucă de cocos” nu e fruct cu coajă (excepție), „oua” fără diacritice e ou.
- [ ] Teste pe profil: id necunoscut ignorat la încărcare; profil gol.
- [ ] Fiecare constatare are `source`.
- [ ] `npm test`, `npx expo lint`, `npx tsc --noEmit` trec.
- [ ] **Pe iPhone** (Lica): cu alergia la gluten bifată, o pâine dă roșu cu motivul vizibil; un produs fără gluten, cu listă completă în română, dă verde; un produs fără ingrediente în OFF dă necunoscut cu explicație.

## Fișiere implicate

- `mobile/src/discriminator/**` (+ teste)
- `mobile/src/storage/profile.ts` (+ test)
- `mobile/src/app/` (profil, rezultat; ecranul de produs din 02 devine ecranul de rezultat sau duce la el)
- `mobile/src/strings.ts`

## Ce NU intră

- Dieta, intoleranțele, afecțiunile, aditivii, nutriția, nivelul galben (module ulterioare; motorul trebuie doar să le permită: reguli noi = rânduri noi).
- **Parserul de ingrediente** (lista împărțită pe ingrediente, ca în wireframe) și tap pe ingredient: sunt în roadmap; acum doar evidențiere în text.
- Backend-ul, fluxul cu poză, butonul „Suggest AI”, istoricul.
- Design vizual final.
- Detectarea limbii din conținut, sinonime în alte limbi decât română și engleză.
