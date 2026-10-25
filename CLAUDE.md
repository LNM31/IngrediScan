# IngrediScan

Aplicație mobilă (laborator, an 4 Calculatoare, UPT) care scanează produse alimentare și spune dacă un produs e ok **pentru user**, după profilul lui de sănătate (alergii, intoleranțe, afecțiuni, dietă). Verdict: roșu / galben / verde / necunoscut + motiv. Senzori: camera + touchscreen. Backend Spring Boot cu CRUD pe `Product`.

Mediu: Fedora + VS Code, doar iPhone (fără Mac, fără Android) → aplicația rulează prin **Expo Go**. Explicații directe, cu motivul din spatele alegerilor.

## Structura

```
mobile/    Expo (SDK 57, React Native 0.86, TypeScript), expo-router în src/app/   → vezi mobile/CLAUDE.md
backend/   Spring Boot 4.1, Java 21, pachet ro.upt.ingrediscan; prompturi Gemini în src/main/resources/gemini/   → vezi backend/CLAUDE.md
docs/      documentația (lista mai jos)
fixtures/  off/products.json (19 răspunsuri OFF reale), gemini/ (rezultatele testului Gemini); date pentru teste
tools/     test-gemini/ (script Python de test pe prompturi)
```

## Comenzi

```bash
# backend (din backend/; .env după modelul example.env)
docker compose up -d          # Postgres 17 pe 127.0.0.1:5432
./mvnw spring-boot:run        # citește backend/.env (spring.config.import), deci rulează din backend/
./mvnw test                   # contextLoads are nevoie de baza pornită

# mobile (din mobile/)
npx expo start                # apoi Expo Go pe iPhone, aceeași rețea cu laptopul
npx expo lint
npx tsc --noEmit
```

## Principii nenegociabile

1. **AI-ul (Gemini) doar citește etichete** (poză → text). Nu primește profilul și nu dă verdictul.
2. **Verdictul îl dă discriminatorul**: funcție pură cu reguli deterministe dintr-un tabel de date, pe telefon.
3. **Profilul nu pleacă de pe telefon.** Backend-ul vede doar produse și poze cu etichete.
4. **Cheia API Gemini stă doar în backend**, niciodată în aplicație sau în git.
5. **Regulile vin din surse oficiale** (Reg. UE 1169/2011 etc.), fiecare constatare are sursa ei.
6. **Text tradus de AI nu dă niciodată verde.** Date incomplete pot bloca doar verdele.
7. **Doar ce merge în Expo Go**; fără biblioteci care cer build nativ.
8. Codul și UI-ul în engleză, documentația în română.

## Roadmap-ul e context, nu scope

Nu implementa nimic din `docs/roadmap.md` dacă task-ul nu cere explicit. Nu adăuga abstracții, servicii goale sau interfețe pentru surse care nu există, în afara punctelor de extensie listate acolo.

## Documentație

| Fișier | Conținut |
|---|---|
| `docs/architecture.md` | ce stă unde, CRUD-ul, `NormalizedProduct`, fluxul, ecranele, repo și setup |
| `docs/discriminator.md` | `evaluate`, tabelul de reguli, nivelurile, modulele, sursele |
| `docs/open-food-facts.md` | API v3.6, câmpurile, lecțiile din testul pe 19 produse |
| `docs/gemini.md` | modelul, apelul, prompturile și schemele, lecțiile din test |
| `docs/decizii.md` | toate deciziile; **orice decizie nouă se notează aici** |
| `docs/roadmap.md` | ce intră la laborator / licență, punctele de extensie, planul |
| `docs/api.md` | contractul API (sursa de adevăr mobile ↔ backend), când există |
| `docs/tasks/` | un fișier per task, când există |
| `docs/specificatie-aplicatie.md` | specificația inițială; unde diferă, câștigă `decizii.md` |
| `docs/diagrame/`, `docs/wireframes/` | diagrama de flux v5, diagramele UML provizorii (`uml-*.excalidraw`), wireframe-ul ecranului de rezultat |

## Cum se lucrează

- O sesiune = un task din `docs/tasks/`. Respectă ce scrie la „ce nu intră”.
- Tot ce trebuie ținut minte stă în fișiere, nu în conversație.
- Dacă codul contrazice documentația, semnalează; nu „repara” documentația sau codul în afara task-ului.
