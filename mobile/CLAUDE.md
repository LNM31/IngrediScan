# mobile/

Aplicația Expo. Versiuni (din `package.json`): Expo SDK 57 (`expo ~57.0.30`), React Native 0.86.3, React 19.2.3, expo-router ~57.0.28, TypeScript ~6.0.3. React Compiler și typed routes sunt activate în `app.json`.

@AGENTS.md

**Peste `AGENTS.md`:** aplicația rulează **doar în Expo Go**. Nu adăuga biblioteci cu cod nativ care cer development build (`expo run:ios`, `eas build`); nu există Mac. Dacă un task pare să ceară așa ceva, oprește-te și semnalează.

## Structura

```
src/app/              ecrane (expo-router); doar rute aici
src/adapters/         OFF / backend / Gemini → NormalizedProduct (funcții pure)
src/discriminator/    evaluate(product, profile), tabelul de reguli, registrul de module
src/api/              apeluri fetch (OFF direct, backend)
src/storage/          profil (secure-store), istoric și cache (sqlite)
src/theme.ts          culori, spațieri, fonturi
```

Folderele apar când e nevoie de ele, nu dinainte. Alias de import: `@/` → `src/`.

## Convenții

- **Navigare**: expo-router.
- **Stiluri**: `StyleSheet` + `theme.ts`. Fără biblioteci de styling.
- **Profilul**: `expo-secure-store` (local, criptat). Nu se trimite nicăieri.
- **Istoric și cache offline**: `expo-sqlite`.
- **Rețea**: `fetch`. Fără axios.
- **State**: React simplu (`useState`, `useContext`). Fără Redux / Zustand până nu apare o nevoie reală.
- **Teste**: jest-expo, pe funcțiile pure (adaptoare, discriminator, validarea EAN-13), cu date din `../fixtures/`.
- **Limba**: cod și UI în engleză. **Toate textele UI stau într-un singur fișier**, ca româna să poată fi adăugată ușor. Sinonimele alergenilor rămân în limba etichetelor.
- Pachete noi: `npx expo install <pachet>`, nu `npm install`.

## Reguli specifice

- **Discriminatorul e funcție pură**, fără importuri din React / Expo / rețea.
- **Open Food Facts se apelează direct** din aplicație, doar API v3.6, cu `User-Agent`, parsare JSON în `try/catch` (vezi `docs/open-food-facts.md`).
- Codurile tastate se validează (lungime + cifră de control EAN-13).
- Pozele se redimensionează și se comprimă înainte de trimiterea la backend.
- **Cheia Gemini nu apare niciodată în aplicație.** Aplicația vorbește doar cu backend-ul nostru: `EXPO_PUBLIC_API_URL` + header-ul `X-Api-Token` cu `EXPO_PUBLIC_API_TOKEN` (din `mobile/.env`, care nu intră în git). Token-ul ajunge în bundle, deci nu e secret.
- Erorile de la backend se tratează **după `code`** din răspuns; `detail` nu se afișează userului.
- Verdictul pe ecran: culoare + iconiță + text, niciodată doar culoare.
- Textul citit de AI se arată userului, editabil, cu `[ilizibil]` evidențiat, și se confirmă înainte de `POST`.
- Contractul cu backend-ul e în `docs/api.md`; nu inventa câmpuri.

## Înainte de a declara un task gata

```bash
npx expo lint
npx tsc --noEmit
```
plus testele, când există.
