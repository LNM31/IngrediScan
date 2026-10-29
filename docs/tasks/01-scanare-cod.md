# 01 · Scanare cod de bare + introducere manuală

**Parte:** mobile · **Stare:** ⏳

## Scop

Userul deschide aplicația în Expo Go, scanează codul de bare al unui produs (sau îl tastează) și vede codul pe ecran. Primul pas din diagrama de flux („Scan product” → „code identified?” → „Retry or type code manually”), fără nimic după.

## De citit întâi

- `mobile/CLAUDE.md` (și `mobile/AGENTS.md`: documentația Expo SDK 58, nu din memorie)
- `docs/architecture.md`, secțiunea „Fluxul”, pașii 1-2

## Ce se face

1. **Dependențe** (doar cu `npx expo install`): `expo-camera`; pentru teste `jest-expo`, `jest`, `@types/jest`. Script `"test": "jest"` în `package.json`, config jest cu preset-ul `jest-expo`.
2. **Funcția pură** `isValidEan13(code: string): boolean`: exact 13 cifre + cifra de control EAN-13 corectă. Nu face trim și nu acceptă alte caractere (curățarea ține de UI). Cu teste.
3. **Fișierul de texte UI** (`src/strings.ts` sau echivalent): toate textele afișate în task stau acolo, în engleză.
4. **Ecrane** (expo-router, în `src/app/`):
   - **Home**: două butoane, „Scan barcode” și „Type code”.
   - **Scan**: camera, doar simbologia EAN-13. La prima citire validă: oprește citirea (o singură navigare per scanare) și duce la ecranul de produs. Cod citit, dar invalid (cifra de control greșită) → mesaj + opțiunile „Retry” / „Type code manually”.
   - **Permisiunea camerei**: dacă nu e dată, se cere; dacă e refuzată, ecranul explică de ce e nevoie și oferă „Type code manually”. Aplicația nu se blochează.
   - **Introducere manuală**: tastatură numerică, maximum 13 cifre, mesaj clar dacă lungimea sau cifra de control e greșită; la cod valid → ecranul de produs.
   - **Produs** (`product/[barcode]`): afișează codul primit. Dacă parametrul nu e un EAN-13 valid (ex. link deep greșit), afișează eroare, nu crapă.
5. Stiluri minime cu `StyleSheet`; fără design (vine la task-ul de UI final).

## Criterii de acceptare

- [x] `npm test` trece. Teste pentru `isValidEan13` cel puțin pe:
  - valide: `5941143028337`, `5900951310959`, `3560070272174` (din `fixtures/off/products.json`)
  - 14 cifre: `59000020012067` (codul tastat greșit din testul OFF) → invalid
  - cifra de control greșită: `5941143028338` → invalid
  - 12 cifre, șir gol, litere, spații (`"594 1143028337"`) → invalid
- [x] `npx expo lint` și `npx tsc --noEmit` fără erori.
- [x] **Pe iPhone, în Expo Go** (verificat de Lica):
  - [x] scanarea unui produs real afișează codul corect, o singură dată;
  - [x] „Type code” cu un cod valid ajunge la același ecran; cu un cod greșit arată eroarea;
  - [x] cu permisiunea camerei refuzată (din Settings), aplicația oferă introducerea manuală.

## Fișiere implicate

- `mobile/package.json` (+ lock), config jest
- `mobile/src/app/` (index, scan, manual, `product/[barcode].tsx`, eventual `_layout.tsx`)
- `mobile/src/barcode/ean13.ts` + test
- `mobile/src/strings.ts`

## Ce NU intră

- Open Food Facts, backend, profil, verdict (task-urile următoare).
- Alte tipuri de coduri (EAN-8, UPC, QR): doar EAN-13, decizia din `api.md`.
- Lanternă, zoom, sunet / vibrație la scanare, istoric.
- Design vizual, `theme.ts` complet, iconițe.
- Orice bibliotecă ce nu merge în Expo Go.

## Capcane

- API-ul camerei s-a schimbat între SDK-uri: verifică în documentația SDK 58 componenta și proprietățile pentru scanarea codurilor, nu din memorie.
- Callback-ul de scanare se apelează de mai multe ori pe secundă cât codul e în cadru: fără blocare, navighezi de zece ori.

## Note după implementare

**Rezultat (2026-10-29):** scanarea și introducerea manuală merg pe iPhone (Expo Go, SDK 58), inclusiv cazurile de eroare la tastare și permisiunea camerei refuzată din Settings. Testele (12), lint și `tsc` trec. Toate criteriile de acceptare sunt îndeplinite.

**Ce a ieșit altfel decât în plan:**
- **Upgrade la SDK 58 în mijlocul task-ului** (vezi `decizii.md`). Codul task-ului n-a trebuit schimbat: `CameraView`, `barcodeScannerSettings`, `onBarcodeScanned`, `useCameraPermissions` sunt identice în documentația SDK 58.
- **ESLint nu era instalat** în proiect, deci `npx expo lint` nu putea rula. S-au adăugat `eslint` + `eslint-config-expo` (dev) și `eslint.config.js` generat de Expo.
- **TypeScript 6 nu mai încarcă automat `@types/*`**: fără `"types": ["jest"]` în `tsconfig.json`, `tsc` nu știe de `describe` / `expect`. Vezi decizia din `decizii.md`.
- `npx expo install <pachete> -- --save-dev` a pus pachetele la `dependencies`. Varianta care merge: `npx expo install <pachete> --dev`.

**Ce s-a învățat:**
- **Typed routes**: o rută nouă în `src/app/` dă eroare la `tsc` până când tipurile din `.expo/types/` se regenerează, iar asta se întâmplă la `npx expo start`. Deci după ce adaugi un ecran, pornești o dată serverul, apoi rulezi `tsc`.
- Blocarea scanării: un `useRef` oprește callback-urile care vin după prima citire, înainte de re-render. Doar un `useState` n-ar fi ajuns, fiindcă mai trec câteva callback-uri până la re-render.
- Ecranul de scanare rămâne montat sub ecranul de produs (stack), așa că camera e randată doar cât ecranul e vizibil (`useIsFocused`). La revenire, `useFocusEffect` resetează blocarea, deci Back = scanare nouă.

**Comportamente alese (pentru task-urile următoare):**
- Scan / manual → produs cu `router.push`: Back de pe produs te întoarce la ecranul de unde ai venit.
- Ecranul de produs revalidează parametrul (deep link greșit → eroare + „Go to home” cu `dismissTo("/")`). Task-ul 02 poate presupune că, după verificare, `barcode` e un EAN-13 valid.
- Permisiunea camerei se cere automat o singură dată. După refuz: explicație + „Allow camera” (dacă iOS mai permite întrebarea) sau „Open Settings”, plus „Type code manually” mereu.
- Câmpul manual păstrează doar cifrele (un cod lipit cu spații se curăță), iar `isValidEan13` rămâne strictă.

**Rămas deschis:**
- Plugin-ul `expo-camera` (cu mesajul de permisiune) nu e în `app.json`: în Expo Go nu are efect. Contează doar dacă apare vreodată un build propriu.
