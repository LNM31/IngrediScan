# Discriminatorul

Discriminatorul e partea care dă verdictul. Rulează **pe telefon**, nu folosește AI și nu face apeluri de rețea.

## Funcția

```
evaluate(product: NormalizedProduct, profile) → { level, findings[] }
```

- Funcție **pură**, fără dependențe de React, Expo sau rețea (ca să poată fi mutată în backend la licență fără rescrierea regulilor).
- `level`: `red` / `yellow` / `green` / `unknown`.
- Fiecare constatare (`finding`) are nivel, motiv afișabil și **sursă** (regula oficială din care vine).
- Ecranul de rezultat se construiește doar din constatări, fără AI.

## Regulile stau într-un tabel de date

Regulile nu sunt împrăștiate prin cod, ci stau într-un tabel:

```
{ type: 'allergen' | 'additive' | 'nutrient', target, threshold?, level, source }
```

(În discuțiile vechi: `{ tip: 'alergen' | 'aditiv' | 'nutrient', tinta, prag?, nivel, sursa }`.)

- Profilul folosește o **listă închisă** de opțiuni (ex: `alergie:arahide`, `celiachie`, `diabet`); fiecare opțiune are regulile ei.
- **Fiecare tip de regulă spune de ce date are nevoie**: alergen / aditiv → ingrediente, nutrient → nutriție. Deci „date suficiente” e **per user**: pentru hipertensiune ajunge nutriția, pentru alergie la arahide trebuie ingredientele.
- Sinonimele alergenilor rămân în limba etichetelor (română, engleză etc.), nu se traduc în engleză odată cu codul.

## Ordinea și nivelurile

- **Ordinea:** roșu → necunoscut → galben → verde.
- Datele incomplete pot bloca **doar verdele**. Un alergen găsit în date parțiale dă roșu direct.
- **Alergenii nu depind de doză**: orice urmă contează → roșu.
- **Afecțiunile dau galben** (contează cantitatea). Roșu doar la contraindicații clare: celiachie + gluten, fenilcetonurie + aspartam.
- **Text tradus de AI** (`traducere_ro`): poate da roșu / galben, **niciodată verde** (rămâne „necunoscut”). O alarmă falsă e în direcția sigură, un alergen pierdut la traducere nu.

## Căutarea în text

- Text normalizat: litere mici, fără diacritice (Gemini și contributorii OFF omit uneori diacriticele, deci normalizarea e obligatorie).
- Căutare cu limite de cuvânt (`\b`), pe tot textul, cu sinonime.
- Textul se împarte la „poate conține / may contain”: ce e după e urmă, nu ingredient.
- **Excepții** per alergen: „unt de cacao”, „unt de arahide”, „lapte de cocos” nu sunt lapte. Fiecare excepție devine test unitar.
- Tag-urile OFF și `alergeni_evidentiati` de la Gemini sunt **semnal secundar**; sursa principală e textul. Regulile despre încrederea în datele OFF sunt în [open-food-facts.md](open-food-facts.md#lecții--reguli).

## Modulele (afecțiuni, alergii, diete)

- Registru de module, fiecare cu `id`, `label`, `rules[]`. Motorul primește modulele bifate în profil și nu știe ce e „diabet”.
- **Datele necesare se deduc din tipurile de reguli**, nu se declară separat (două liste ar ajunge să se contrazică).
- Profilul reține doar id-uri; **id-urile necunoscute (modul scos) se ignoră** la încărcare. Test unitar de la început.
- O afecțiune nouă = rânduri noi în tabel, motorul nu se schimbă.
- **Ordinea de lucru**: arhitectura de module se pune de la început (costă aproape nimic); modulele în sine (diabet, hipertensiune etc.) se adaugă după ce miezul merge cap-coadă. La laborator, miezul obligatoriu e **alergeni + dietă**.

## Surse

„Cine știe ce e rău?” Doar surse oficiale:

- **Reg. UE 1169/2011, Anexa II**: cei 14 alergeni (gluten, crustacee, ouă, pește, arahide, soia, lapte, fructe cu coajă, țelină, muștar, susan, sulfiți, lupin, moluște)
- **Reg. UE 1169/2011, Anexa III**: aspartamul („conține o sursă de fenilalanină”)
- **Reg. UE 828/2014**: pragul pentru „fără gluten”
- **Semaforul nutrițional FSA (UK)** și **Reg. UE 1924/2006**: praguri de nutrienți. Praguri de pornire: zahăr 22,5 g, sare 1,5 g, grăsimi saturate 5 g la 100 g; la băuturi jumătate
- **OMS**: recomandări generale (ex: sub 5 g sare pe zi)

Aplicația nu acoperă „toate afecțiunile”, ci o listă închisă pentru care există reguli clare în surse oficiale. La afecțiunile care depind de pacient doar avertizează și trimite la medic.

## Cantitate și frecvență

- **Verdictul e pe compoziția produsului**, nu pe consum.
- Aplicația **arată** cantitatea, nu o **prescrie**: porția + cât înseamnă din valoarea zilnică de referință (Reg. UE 1169/2011, Anexa XIII: zahăr 90 g, sare 6 g, grăsimi 70 g, grăsimi saturate 20 g). Calcul: `valoare_la_100 × porție / 100`, împărțit la referință.
- **Frecvența ține de medic.** Exemplu: cola pentru un diabetic poate fi problemă sau chiar tratament (la hipoglicemie), deci aplicația nu are cum să decidă.
- Temporizarea reală (jurnal de consum) e în [roadmap.md](roadmap.md), nu în discriminator.

## Teste

Teste unitare (jest-expo) pe `evaluate`: fiecare regulă, fiecare excepție, ordinea nivelurilor, date parțiale, text tradus, id-uri de modul necunoscute. Datele de intrare vin din `fixtures/`.
