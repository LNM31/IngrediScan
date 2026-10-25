# Arhitectura

## Ce e IngrediScan

Aplicație mobilă care scanează produse alimentare și îi spune userului dacă un produs e ok **pentru el**, în funcție de profilul de sănătate (alergii, intoleranțe, afecțiuni, dietă). Verdictul are 4 stări: roșu / galben / verde / necunoscut, plus motivul.

Pe scurt: **Yuka îți spune dacă un produs e sănătos în general, IngrediScan îți spune dacă e ok pentru tine.** („IngrediScan” e nume provizoriu.)

**Cerința laboratorului:**
- cel puțin 2 senzori: **camera + touchscreen** (profesorul a confirmat touchscreen-ul ca senzor). Face ID / microfon doar bonus.
- CRUD minimal cu un backend: **CRUD pe entitatea `Product`, backend Spring Boot** (lămurit cu profesorul).
- Descriere pentru tabelul de proiecte: „Aplicație mobilă care scanează produsele alimentare și îți spune dacă sunt potrivite pentru tine, în funcție de alergii, intoleranțe și afecțiuni (cameră + touchscreen).”

## Diferențe față de aplicațiile existente

- **Yuka**: scor general 0-100 (nutriție, aditivi, bio). Nu ia în calcul afecțiunile.
- **Open Food Facts (aplicația)**: Nutri-Score, NOVA, alergeni, preferințe personale și avertizări de alergeni. La alergii și dietă se suprapune parțial.
- **Ce rămâne diferit la IngrediScan**: afecțiuni, verdict personalizat cu sursă pentru fiecare regulă, răspuns pe poză când produsul lipsește sau e incomplet, bază proprie de produse românești care crește cu fiecare poză confirmată.

## Principii (nenegociabile)

- **AI-ul doar citește etichete** (poză → text). Nu știe cine e userul și nu dă verdictul.
- **Verdictul îl dă aplicația**, cu reguli deterministe din cod (discriminatorul): reproductibil, testabil, explicabil (știi ce regulă a declanșat), merge offline. Detalii în [discriminator.md](discriminator.md).
- **Profilul nu pleacă de pe telefon.** Backend-ul vede doar produse și poze cu etichete. Deci fără date de sănătate pe server, fără login, fără GDPR la laborator.
- **Regulile vin din surse oficiale**, nu din „judecata” aplicației sau a AI-ului.
- **AI-ul transcrie, codul interpretează.** Valorile nutriționale vin ca text exact de pe etichetă („<0,5 g”); parsarea, conversia sodiu → sare (×2,5, Reg. UE 1169/2011, Anexa I) și scoaterea titlului „Ingrediente:” se fac în adaptor, ca funcții pure, testabile.
- **Cheia API Gemini stă doar în backend**, niciodată în aplicație.
- Tot ce folosește aplicația mobilă trebuie să meargă în **Expo Go** (vezi [decizii.md](decizii.md)).

## Ce stă unde

| Aplicația mobilă (Expo) | Backend (Spring Boot) |
|---|---|
| scanare cod de bare (camera, live) + introducere manuală (validare EAN-13) | CRUD pe `Product` |
| profilul (local, criptat cu `expo-secure-store`) | endpoint poze → Gemini (cheia API aici); mai târziu endpoint separat pentru tabelul nutrițional |
| apel **direct** la Open Food Facts (limitele OFF sunt pe IP) | token simplu în header (aplicație ↔ backend) |
| adaptorul `NormalizedProduct` + cache local offline | validare: cod EAN-13 valid, text ingrediente negol |
| **discriminatorul** | baza de date: PostgreSQL 17 în Docker |
| istoricul | |

### CRUD-ul

Fiecare operație are un motiv real în aplicație:

| | Endpoint | Când |
|---|---|---|
| Create | `POST /api/products` | userul confirmă lista de ingrediente citită din poză |
| Read | `GET /api/products/{code}` | la fiecare scanare, înainte de OFF |
| Update | `PUT /api/products/{code}` | userul corectează o listă greșită |
| Delete | `DELETE /api/products/{code}` | userul șterge un produs adăugat greșit |

Contractul exact (JSON request / răspuns, coduri de eroare, header-ul de token) e în [api.md](api.md), care e sursa de adevăr pentru ambele părți. Endpoint-ul de etichetă e `POST /api/labels/ingredients`.

**Entitatea `Product`**: cod de bare, nume, brand, cantitate, URL poză (din OFF, doar pentru afișare), text ingrediente, „poate conține”, limbă, traducere în română, sursa ingredientelor (`ai` / `user`), nutriție (opțională) și sursa ei (`off` / `ai` / `user`), datele de creare și modificare. Câmpurile exacte sunt în [api.md](api.md#resursa-product).

### Denumiri

Codul e în engleză; discuțiile vechi și diagrama folosesc nume românești:

| În documente / diagramă | În cod |
|---|---|
| `Produs` | `Product` |
| `ProdusNormalizat` | `NormalizedProduct` |
| `evalueaza` | `evaluate` |
| `constatari` | `findings` |
| `/api/produse` | `/api/products` |
| `/api/eticheta` | `/api/labels/ingredients` |

Câmpurile din schemele Gemini rămân în română (`ingrediente_text`, `text_complet` etc.), pentru că prompturile sunt înghețate (vezi [gemini.md](gemini.md)). Schema e un detaliu intern al backend-ului: backend-ul redenumește cheile în engleză (doar numele, valorile trec neatinse), iar aplicația primește contractul din [api.md](api.md) și îl transformă în `NormalizedProduct`.

### `NormalizedProduct`

Fiecare sursă (OFF, baza proprie, Gemini pe ingrediente, Gemini pe tabelul nutrițional) are un **adaptor** care produce același tip `NormalizedProduct`. Ingredientele și nutriția sunt **părți opționale, independente**, completate de surse diferite. Fallback-ul e pe bucăți: dacă lipsesc doar ingredientele, nutriția din OFF se păstrează. Scoți nutriția = ștergi un prompt și un endpoint, ingredientele rămân neatinse.

## Fluxul

Diagrama: [diagrame/diagrama-flux-v5.png](diagrame/diagrama-flux-v5.png) (sursa editabilă: `diagrame/diagrama-flux_v5.excalidraw`). Versiunea v5 e finală. Pentru documentația de predare trebuie o copie „curată” (titlu „IngrediScan: diagrama de flux”, fără legenda neschimbat / modificat / nou și fără panoul cu ce s-a scos).

**Diagrame UML provizorii** (2026-10-25, pentru prezentare; se actualizează la final): `diagrame/uml-use-case.excalidraw`, `diagrame/uml-activitate.excalidraw` (fluxul v5 în notație UML de activitate, cu swimlanes și pasul de confirmare a textului), `diagrame/uml-clase.excalidraw` (model de domeniu: `Product` / `Nutrition` / `LabelReading` din `api.md`, `NormalizedProduct`, profil / module / reguli, `Verdict` / `Finding`). Diagrama de stare se face după task-ul 07.

1. Scan → (cod neidentificat → „Retry or type code manually”: *retry* înapoi la scanare, *typed code* direct la Check product DB) → **Check product DB** (backend, GET)
2. Nu e în DB → **Client calls OFF API** → produs găsit? → Display name
3. **Run System Discriminator** (pe telefon) pe ce date există → **Result?**
   - roșu / galben / verde → Display response (din constatări, fără AI) → Save to history
   - necunoscut → **Photos already taken?**
     - nu → Display „Not enough data” → Suggest AI
     - da → Show „Unknown, check the label” (evită bucla infinită)
4. Produs negăsit în OFF → Display „Not Found Product” → Suggest AI
5. Suggest AI → User accepts? → 1-3 poze → backend → Gemini → Gemini available? → **Text complete and readable?**
   - nu, prima dată → poză la partea lipsă (o singură reîncercare)
   - nu, după reîncercare / user refuză / Gemini picat → Show „Unknown, check the label”
   - da → **Merge with OFF data + save (POST)** → Run System Discriminator

**„Text complete?” îl decide aplicația**, din câmpurile da/nu întoarse de Gemini (`text_complet`, `zone_ilizibile`, `are_sectiune_ingrediente`). Userul vede textul citit și îl confirmă înainte de salvare.

**„Poza la partea lipsă” poate fi și tabelul nutrițional**: aplicația cere doar ce le trebuie modulelor din profil (hipertensiune fără nutriție în OFF → poză la tabel; doar alergii → nu cere tabelul). Diagrama v5 rămâne valabilă.

**Scos intenționat din diagrama originală** (nu se readuce): „Client send data to backend”, „send result to Gemini to create response”, „confidence score enough?” (un procent dat de Gemini e inventat, nu măsurat), „Gemini returns response” (contopit), bucla „+1 (5 max)” cu reluare de la zero.

## Ecrane

Ecranele din specificație: onboarding + disclaimer, profil, scanare, rezultat, istoric. În plus: **introducerea manuală a codului** și **confirmarea textului citit de AI** (cu `[ilizibil]` evidențiat, editabil, confirmare înainte de POST).

Wireframe-uri: schițe (cutii, text, butoane, fără culori) în Excalidraw, doar pentru ecranele importante, înainte de task-ul fiecăruia. Există: **rezultatul** ([wireframes/wireframe_rezultat_v1.png](wireframes/wireframe_rezultat_v1.png)): poză + nume + brand/cantitate (din OFF / baza proprie), verdictul, motivul (din constatările discriminatorului), lista de ingrediente cu cel problematic evidențiat, tap pe ingredient → detalii (mai târziu), „Scan another”. De făcut: confirmarea textului citit de AI.

Reguli UI:
- **Verdictul nu se transmite doar prin culoare**: culoare + iconiță + text (daltonism roșu / verde).
- Disclaimer: *informații, nu sfaturi medicale*.
- Designul vizual vine la „UI final”, direct în cod.

## Repo și setup

```
IngrediScan/
├── CLAUDE.md, README.md, .gitignore
├── mobile/      # Expo; src/app/ (ecrane, expo-router), src/{adapters,discriminator,api,storage}/ când e nevoie
├── backend/     # Spring Boot, pachet ro.upt.ingrediscan; product/, label/; resources/gemini/ (prompturi + scheme)
├── docs/        # documentația; diagrame/, wireframes/, archive/; api.md, tasks/ când există
├── fixtures/    # off/products.json (19 produse), gemini/ (rezultatele testului)
└── tools/       # test-gemini/ (citește prompturile din backend, scrie în fixtures/gemini)
```

- Subfolderele din `mobile/src/` și pachetele din backend apar când e nevoie de ele.
- **Prompturile Gemini stau într-un singur loc**: `backend/src/main/resources/gemini/`.
- **Pozele de test nu intră în repo** (HEIC de 2-3 MB umflă istoricul git); stau pe Drive.
- `mvnw.cmd` rămâne (pentru cine clonează pe Windows); warning-ul LF/CRLF e intenționat (`.gitattributes` de la Initializr).

**Postgres în Docker**: `backend/compose.yaml`, imaginea `postgres:17` fixată (nu `latest`), port legat la `127.0.0.1:5432` (nu expus în rețea), volum `ingrediscan-data`. Numele bazei, userul și parola vin din `backend/.env` (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`; model în `backend/example.env`), citite atât de compose, cât și de Spring (`spring.config.import=optional:file:.env[.properties]` în `application.properties`). Fără valori implicite: fără `.env`, nici baza, nici backend-ul nu pornesc. `spring.jpa.hibernate.ddl-auto=update` la laborator (la licență → Flyway).

⚠️ Sintaxa valorilor implicite diferă: în compose `${X:-implicit}` (cu liniuță), în Spring `${X:implicit}` (fără). Liniuța pusă în Spring devine parte din valoare. Cheia Gemini nu are niciodată valoare implicită.

Ordinea la pornire: `docker compose up -d` (în `backend/`), apoi backend-ul. Backend-ul rulează pe laptop, doar baza de date e în container.

**În dezvoltare / la demo:** Expo Go cere ca iPhone-ul să vadă laptopul în rețea. La demo: aceeași rețea sau Tailscale.
