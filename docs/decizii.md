# Decizii

Orice decizie nouă luată pe parcurs se notează aici, cu data și motivul. Ce e aici are prioritate față de `specificatie-aplicatie.md` (scrisă înainte de majoritatea deciziilor, vezi ultima secțiune).

## Decizii luate (până la 2026-10-19)

| Subiect | Decizie | De ce |
|---|---|---|
| Senzori | camera + touchscreen (Face ID / microfon doar bonus) | touchscreen-ul confirmat de profesor ca senzor |
| Framework | **React Native + Expo**, rulat pe iPhone prin **Expo Go** | nu există Mac, doar Fedora + iPhone |
| Biblioteci mobile | doar ce merge în Expo Go | cod nativ custom (ex: ML Kit pentru OCR) cere build nativ, adică Mac sau cont Apple Developer plătit |
| Open Food Facts | **doar API v3.6**, versiune fixată în URL | v2 e deprecated |
| Cine dă verdictul | **aplicația, prin reguli în cod** (discriminatorul); AI-ul doar citește etichete | reproductibil, testabil, explicabil, offline |
| Unde rulează discriminatorul | **pe telefon** | backend-ul nu vede niciodată profilul |
| Backend (laborator) | **Spring Boot**: CRUD pe `Product` + endpoint care trimite pozele la Gemini | cerința de CRUD; cheia API stă pe server |
| Arhitectura datelor | fiecare sursă are un adaptor care produce același tip `NormalizedProduct` | surse multiple, părți opționale |
| Fallback | poză + Gemini, o singură reîncercare, apoi verdict „necunoscut” | fără bucle infinite |
| AI | **Gemini 3.8 Flash** (nivel gratuit), nu model local | |
| Apelul la Gemini | `models.generate_content`, **nu** Interactions API | Interactions e beta, a avut breaking changes în mai 2026 |
| Configurare Gemini | `system_instruction` și `response_json_schema` separate; thinking **low**; fără `temperature` | `temperature` e ignorat la 3.x; timpii cu medium sunt prea mari |
| Etichetă în limbă străină | originalul în `ingrediente_text`, traducerea în `traducere_ro`; pe traducere roșu / galben, **niciodată verde** | un alergen pierdut la traducere e mai grav decât o alarmă falsă |
| Nutriție din poză | prompt, schemă și endpoint separate de ingrediente | se poate scoate fără să atingă ingredientele |
| Afecțiuni | **modulare**: rânduri noi în tabelul de reguli, motorul neschimbat | |
| Fără scor de încredere de la AI | se folosesc doar câmpuri da/nu + `[ilizibil]` | un procent dat de model e inventat, nu măsurat |
| Login | **nu la laborator**, doar la licență | fără date de sănătate pe server |
| Limba | **codul și UI-ul în engleză**, documentația în română. Sinonimele alergenilor rămân în limba etichetelor. Textele UI într-un singur fișier | româna se adaugă ușor mai târziu |
| Bază de date | **PostgreSQL 17 în Docker** (compose), de la început, fără H2 | |
| Backend, dependențe | Spring Web (MVC), Spring Data JPA, Validation, PostgreSQL Driver, DevTools, Lombok. **Fără** MapStruct, Spring Security (la laborator), H2. Mai târziu, manual: springdoc-openapi, SDK-ul Gemini pentru Java | minim necesar |
| Backend, convenții | vezi `backend/CLAUDE.md` | |
| Mobile, convenții | vezi `mobile/CLAUDE.md` | |
| Wireframe-uri | Excalidraw, doar rezultat + confirmarea textului AI, înainte de task-ul fiecăruia; designul vizual direct în cod la „UI final”; Figma eventual la licență | |
| Verdict pe ecran | culoare + iconiță + text, niciodată doar culoare | daltonism roșu / verde |
| Pozele de test | nu intră în repo, stau pe Drive | HEIC de 2-3 MB umflă istoricul git |
| Migrări DB | `ddl-auto=update` la laborator, Flyway la licență | |

## Decizii noi

<!-- Format: ### AAAA-LL-ZZ: titlu — ce s-a decis, de ce, ce alternative s-au respins. -->

### 2026-10-22: Configurarea locală a backend-ului

- **`backend/.env` e singura sursă pentru config local.** Compose îl citește automat; Spring îl citește prin `spring.config.import=optional:file:.env[.properties]`. De ce: `./mvnw spring-boot:run` merge fără `export` manual. Respins: `spring-boot-docker-compose` (dependență în plus, nu e pe lista convenită).
- **Fără valori implicite** pentru `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD`, nici în compose, nici în Spring. Fără `.env`, pornirea pică explicit, în loc să meargă cu o parolă ghicită.
- **Fișierul compose e `backend/compose.yaml`** (numele preferat de Docker Compose) și e versionat; nu conține secrete, doar `${...}`.
- Comenzile backend-ului se rulează din `backend/` (calea `.env` e relativă la folderul curent).

### 2026-10-22: Numele cheii Gemini

- **`GEMINI_API_KEY` peste tot**: `.env`, backend, `tools/test-gemini`. Respins: `GOOGLE_API_KEY` (SDK-urile Google le acceptă pe amândouă, iar dacă sunt setate ambele, una o ignoră pe cealaltă; un singur nume elimină confuzia).
- În backend cheia se dă **explicit** clientului Gemini, din proprietatea `gemini.api-key=${GEMINI_API_KEY}`, fără valoare implicită.

### 2026-10-22: Ce e versionat

- În git: `docs/` (fără `docs/archive/`), `fixtures/`, `tools/`. Ignorate: `.env`, `**/.venv/`, pozele de test din `tools/test-gemini/poze*/`, `docs/archive/`.

### 2026-10-24: Contractul API

Detaliile sunt în `api.md`; aici doar ce s-a decis și de ce.

- **`Product`**: `source` unic devine `ingredientsSource` (`ai` / `user`) + `nutritionSource` (`off` / `ai` / `user`), pentru că un produs salvat după poză are de obicei ingredientele de la AI și nutriția din OFF. `confirmed` dispare (la laborator se salvează doar după confirmare, deci ar fi mereu `true`). Apar `quantity` și `imageUrl`, doar pentru afișare (la a doua scanare produsul vine din baza noastră, nu din OFF).
- **`ingredientsText` cu `[ilizibil]` e respins** la `POST` / `PUT`: baza proprie se verifică înaintea OFF, deci conține doar liste complete.
- **Endpoint de etichetă: `POST /api/labels/ingredients`**, `multipart/form-data`, 1-3 poze JPEG (≤ 1600 px, ≤ 2 MB / poză). Respins: base64 în JSON (+33% mărime). `/api/labels/nutrition` doar rezervat.
- **Backend-ul redenumește cheile Gemini în engleză**; valorile trec neatinse (nu se traduce, nu se interpretează). Schema Gemini rămâne internă backend-ului, deci o schimbare de prompt nu atinge aplicația. Respins: aplicația să primească schema în română.
- **Erori: `ProblemDetail` (RFC 9457) + câmpul `code`**, dintr-un singur `@RestControllerAdvice`. Aplicația decide doar după `code` și nu afișează `detail`.
- **Token în `X-Api-Token`**; nu e secret (ajunge în bundle), doar ține deoparte traficul întâmplător.
- **Timpi: backend → Gemini 60 s, aplicație → backend 70 s, fără reîncercări automate.** Valori de pornire, de revizuit după măsurarea cu thinking low.
- **Fără endpoint de listare** (niciun ecran nu-l folosește). **Doar EAN-13** (EAN-8 rămâne întrebare deschisă).
- **Forma lui `nutrition` e provizorie**: valorile sunt numere la 100 g / 100 ml, interpretate de adaptorul din aplicație.

### 2026-10-24: Testul de nutriție se amână

Nu blochează lab-ul obligatoriu (alergeni + dietă), iar nutriția din OFF vine deja numerică. Se face înainte de `POST /api/labels/nutrition` și de modulele de diabet / hipertensiune; poate schimba forma lui `nutrition`.

## Diferențe față de `specificatie-aplicatie.md`

Specificația e anterioară deciziilor de mai sus. Unde diferă, câștigă acest fișier:

- **Backend-ul**: specificația îl pune doar la licență; acum există de la laborator (CRUD pe `Product` + endpoint Gemini).
- **Verdictul**: specificația are 3 culori; acum sunt 4 stări (plus „necunoscut”).
- **Rolul AI-ului**: specificația îi dă și explicații și „cazuri nuanțate” pe profil (trimis anonimizat); acum AI-ul doar transcrie etichete și nu primește niciodată profilul.
- **Potrivirea cu profilul**: specificația zice „local / în backend”; acum doar pe telefon.
- **Baza de date**: specificația zice „de decis”; acum PostgreSQL 17.
- **Tabelul comparativ** din secțiunea 2 a specificației e prea dur cu Open Food Facts (OFF are alergeni, preferințe și avertizări); versiunea corectă e în `architecture.md`. De corectat.
- **Medicamente**: specificația le are la „nice to have laborator”; acum sunt la licență (vezi `roadmap.md`).
