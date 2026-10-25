# 03 · CRUD pe `Product` + erori + token

**Parte:** backend · **Stare:** ⏳

## Scop

Cele patru endpoint-uri de produse din `docs/api.md`, exact ca în contract: cerința de CRUD a laboratorului. Plus cele două lucruri comune tuturor endpoint-urilor viitoare: formatul de eroare și token-ul.

## De citit întâi

- `docs/api.md` (tot; e sursa de adevăr)
- `backend/CLAUDE.md`
- Spring Boot **4.1** a mutat pachete față de 3.x (inclusiv cele de test): verifică în documentația versiunii, nu din memorie.

## Ce se face

1. **Pachetul `ro.upt.ingrediscan.product`**: entitatea `Product` (cheia = `barcode`, `String`), nutriția ca `@Embeddable` cu coloane nullable, repository, service, controller, DTO-uri ca `record` (request / response separate de entitate).
   - Lombok pe entitate și pe embeddable: doar `@Getter`, `@Setter`, `@NoArgsConstructor`.
   - `createdAt` / `updatedAt` ca `Instant`, setate de server, serializate ISO 8601 UTC.
   - Enum-urile se văd în JSON cu litere mici, ca în contract (`"ai"`, `"off"`, `"100g"`, `"as_sold"`).
2. **Validarea** din `api.md`, secțiunea „Validare”: EAN-13 (adnotare proprie, refolosită și pe path), `ingredientsText` negol și ≤ 5000, fără `[ilizibil]`, `ingredientsTranslationRo` obligatoriu doar dacă limba nu e `ro` / `en`, `nutritionSource` obligatoriu dacă `nutrition` ≠ null.
3. **Erorile** (pachet comun, ex. `ro.upt.ingrediscan.common`): un singur `@RestControllerAdvice` care produce `ProblemDetail` + `code` pentru **toate** codurile din tabelul din `api.md`, inclusiv `errors[]` la `VALIDATION_FAILED`, `NOT_FOUND` / `METHOD_NOT_ALLOWED` pentru rute și metode greșite, `INTERNAL_ERROR` pentru restul (fără stack trace în răspuns).
4. **Token-ul**: un filtru pe `/api/**` care compară `X-Api-Token` cu proprietatea `api.token=${API_TOKEN}` (fără valoare implicită). Atenție: erorile din filtru **nu** trec prin `@RestControllerAdvice`, deci filtrul scrie singur același `ProblemDetail` (`401`, `UNAUTHORIZED`, `application/problem+json`).
5. `API_TOKEN` adăugat în `backend/example.env`.

## Criterii de acceptare

- [ ] `./mvnw test` trece (cu Postgres pornit). Teste cel puțin pentru:
  - fiecare endpoint, cazul fericit (status, body, header `Location` la `POST`);
  - `404 PRODUCT_NOT_FOUND`, `409 PRODUCT_ALREADY_EXISTS`, `400 INVALID_BARCODE` (cifra de control greșită, 14 cifre);
  - `VALIDATION_FAILED` cu `errors[]`: text gol, text cu `[ilizibil]`, limbă `pl` fără traducere, `nutrition` fără `nutritionSource`;
  - `MALFORMED_REQUEST` pe JSON stricat și pe enum necunoscut (`"ingredientsSource": "robot"`);
  - `401 UNAUTHORIZED` fără token și cu token greșit, în formatul `ProblemDetail`;
  - `PUT` înlocuiește tot (un câmp omis devine `null`), nu creează produse noi;
  - un ciclu complet create → read → update → delete → read (404) pe baza reală, cu rollback după test.
- [ ] Verificat manual cu `curl` (Lica): cele patru operații și o eroare, cu răspunsurile identice cu exemplele din `api.md`.
- [ ] Niciun răspuns de eroare nu conține stack trace sau numele claselor Java.

## Fișiere implicate

- `backend/src/main/java/ro/upt/ingrediscan/product/**`
- `backend/src/main/java/ro/upt/ingrediscan/common/**` (erori, token)
- `backend/src/main/resources/application.properties` (`api.token`)
- `backend/example.env`
- `backend/src/test/java/ro/upt/ingrediscan/**`

## Ce NU intră

- `/api/labels/*` și SDK-ul Gemini (task-ul 05).
- `GET /api/products` (listă), paginare, căutare.
- Spring Security, CORS, springdoc-openapi, Flyway, MapStruct, H2 / Testcontainers.
- Orice câmp, endpoint sau cod de eroare care nu e în `api.md`. Dacă pare că lipsește ceva din contract: **oprește-te și semnalează**, nu inventa.
