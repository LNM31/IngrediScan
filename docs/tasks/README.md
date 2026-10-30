# Task-uri

Un fișier per task: scop, criterii de acceptare, fișiere implicate, ce **nu** intră. Doar următoarele 3-4 task-uri sunt detaliate; restul sunt câte un rând și se detaliază când se ajunge la ele (ce învățăm la un task schimbă următoarele).

## Cum se lucrează un task

1. **Sesiune nouă** de Claude Code (curată, fără conversații anterioare), pornită din **rădăcina repo-ului**, cu:
   > Implementează `docs/tasks/NN-nume.md`. Citește întâi documentele la care trimite task-ul. Rulează verificările din task, nu face commit, iar la final spune-mi ce ai schimbat și ce trebuie să verific eu.
2. Sesiunea implementează, rulează verificările din task și se oprește. **Nu face commit.**
3. Verifici tu: rulezi pe iPhone / cu `curl`, citești diff-ul, întrebi ce nu e clar.
4. Înainte de commit, sesiunea adaugă la finalul fișierului task-ului o secțiune **„Note după implementare”**: ce a ieșit altfel decât în plan, ce s-a învățat, ce a rămas deschis. Deciziile noi → `docs/decizii.md`.
5. Commit (tu). Bifezi task-ul mai jos.
6. Dacă sesiunea se lungește sau o ia pe alături: o oprești, notezi în fișierul task-ului unde a rămas, pornești alta.

## Cum se planifică următoarele task-uri

Când lotul curent e aproape gata, o **sesiune nouă de planificare** (nu sesiunea ultimului task), din rădăcină:

> Sesiune de planificare. Citește `docs/tasks/README.md`, task-urile terminate cu notele lor, `docs/decizii.md` și `docs/roadmap.md`. Detaliază task-urile NN-MM în același format ca cele existente. Nu scrie cod.

Tot ce îi trebuie e în fișiere: task-urile bifate, notele de după implementare, deciziile, contractul.

Dacă un task cere o schimbare de contract, se schimbă **întâi** `docs/api.md`, separat, apoi codul.

## Lista

| # | Task | Parte | Depinde de | Stare |
|---|---|---|---|---|
| 01 | [Scanare cod de bare + introducere manuală](01-scanare-cod.md) | mobile | — | ✅ |
| 02 | [Open Food Facts → `NormalizedProduct` → numele pe ecran](02-off-adaptor.md) | mobile | 01 | ✅ |
| 03 | [CRUD pe `Product` + erori + token](03-backend-crud.md) | backend | — | ⏳ |
| 04 | [Profil (alergeni) + discriminator + ecranul de rezultat](04-profil-discriminator.md) | mobile | 02 | ⏳ |
| 05 | `POST /api/labels/ingredients` → Gemini (+ măsurarea timpilor cu medium) | backend | 03 | de detaliat |
| 06 | Fluxul cu poză: captură, redimensionare, upload, ecranul de confirmare a textului, `POST` (+ nutriția din OFF în `NormalizedProduct`) | mobile | 04, 05 | de detaliat |
| 07 | Fluxul complet după diagramă: baza proprie → OFF → discriminator → rezultat / sugestie AI | mobile | 03, 06 | de detaliat |
| 08 | Istoric + cache offline (`expo-sqlite`) | mobile | 07 | de detaliat |
| 09 | Dieta (vegetarian / vegan) ca module | mobile | 04 | de detaliat |
| 10 | UI final (design vizual, `theme.ts`) | mobile | 07 | de detaliat |
| 11+ | Modulele de afecțiuni (după testul de nutriție, vezi `roadmap.md`) | ambele | 07 | — |

03 nu depinde de partea de mobile: se poate face oricând, în paralel cu 01-02.
