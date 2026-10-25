# 01 · Scanare cod de bare + introducere manuală

**Parte:** mobile · **Stare:** ⏳

## Scop

Userul deschide aplicația în Expo Go, scanează codul de bare al unui produs (sau îl tastează) și vede codul pe ecran. Primul pas din diagrama de flux („Scan product” → „code identified?” → „Retry or type code manually”), fără nimic după.

## De citit întâi

- `mobile/CLAUDE.md` (și `mobile/AGENTS.md`: documentația Expo SDK 57, nu din memorie)
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

- [ ] `npm test` trece. Teste pentru `isValidEan13` cel puțin pe:
  - valide: `5941143028337`, `5900951310959`, `3560070272174` (din `fixtures/off/products.json`)
  - 14 cifre: `59000020012067` (codul tastat greșit din testul OFF) → invalid
  - cifra de control greșită: `5941143028338` → invalid
  - 12 cifre, șir gol, litere, spații (`"594 1143028337"`) → invalid
- [ ] `npx expo lint` și `npx tsc --noEmit` fără erori.
- [ ] **Pe iPhone, în Expo Go** (verificat de Lica):
  - scanarea unui produs real afișează codul corect, o singură dată;
  - „Type code” cu un cod valid ajunge la același ecran; cu un cod greșit arată eroarea;
  - cu permisiunea camerei refuzată (din Settings), aplicația oferă introducerea manuală.

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

- API-ul camerei s-a schimbat între SDK-uri: verifică în documentația SDK 57 componenta și proprietățile pentru scanarea codurilor, nu din memorie.
- Callback-ul de scanare se apelează de mai multe ori pe secundă cât codul e în cadru: fără blocare, navighezi de zece ori.
