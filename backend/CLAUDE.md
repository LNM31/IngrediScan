# backend/

Spring Boot pentru laborator: CRUD pe `Product` + endpoint care trimite pozele la Gemini. Versiuni (din `pom.xml`): **Spring Boot 4.1.1**, **Java 21**, Maven wrapper 3.10.0. `groupId` `ro.upt`, `artifactId` `ingrediscan-backend`, pachetul rădăcină **`ro.upt.ingrediscan`**.

Spring Boot 4 (Spring Framework 7, Jackson 3) a schimbat nume de starteri și de pachete față de 3.x (ex: `spring-boot-starter-webmvc`). Verifică API-urile în documentația versiunii, nu din memorie.

## Comenzi

```bash
docker compose up -d        # Postgres 17 (docker-compose.yaml, citește .env)
./mvnw spring-boot:run      # cere POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD în mediu
./mvnw test
```

Config: `src/main/resources/application.properties` (datasource din variabile de mediu, `ddl-auto=update`). Model de `.env`: `example.env`. `.env` nu intră în git.

## Structura

Pachete pe funcționalitate, nu pe straturi:

```
ro.upt.ingrediscan/
├── product/     entitatea Product, repository, service, controller, DTO-uri
├── label/       endpoint-ul poze → Gemini
└── (handler-ul global de erori)
```

Prompturile și schemele Gemini: `src/main/resources/gemini/`. `prompt.txt` și `schema.json` (ingrediente) sunt **înghețate**: nu le modifica. Detalii în `docs/gemini.md`.

## Convenții

- **DTO-uri ca `record`**. Entitatea nu iese direct din controller.
- **Lombok doar pe entitate**: `@Getter`, `@Setter`, `@NoArgsConstructor`. **Niciodată `@Data`.**
- **Un singur `@RestControllerAdvice`**, cu același format de eroare pentru toate endpoint-urile (formatul e în `docs/api.md`).
- Validare cu Bean Validation: cod EAN-13 valid, text ingrediente negol.
- Token simplu în header între aplicație și backend.
- Dependențe: Spring Web MVC, Spring Data JPA, Validation, PostgreSQL Driver, DevTools, Lombok. **Fără** MapStruct, Spring Security, H2. Mai târziu, adăugate manual: springdoc-openapi, SDK-ul Gemini pentru Java.
- Contractul (căi, câmpuri JSON în engleză, coduri de eroare) e în `docs/api.md`; nu inventa endpoint-uri sau câmpuri.

## Gemini

- `models.generate_content`, nu Interactions API.
- `system_instruction` și `response_json_schema` ca parametri separați, thinking **low**, fără `temperature`.
- Model `gemini-3.8-flash`. Cheia din variabilă de mediu, **fără valoare implicită**, niciodată în cod sau în git.

## Ce nu intră în backend

- **Profilul și orice dată de sănătate.** Backend-ul de laborator vede doar produse și poze cu etichete.
- **Verdictul.** Discriminatorul rulează pe telefon.
- Login / conturi (doar la licență).
- Apelurile la Open Food Facts (le face aplicația direct).
