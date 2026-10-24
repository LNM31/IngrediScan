# Roadmap

> **Roadmap-ul e context, nu scope.** Nimic de aici nu se implementează dacă task-ul curent nu cere explicit. Nu se adaugă abstracții, servicii goale sau interfețe pentru surse care nu există, în afara punctelor de extensie listate mai jos.

## Ce intră unde

**Laborator, obligatoriu:**
- scanare → baza din backend → OFF → verdict pe **alergeni + dietă** (4 stări)
- poză + Gemini prin backend, cu confirmarea userului
- CRUD pe produse
- profil local + istoric

**Laborator, dacă e timp** (în ordinea asta, ca module, după ce miezul merge cap-coadă):
1. diabet și hipertensiune ca galben (zahăr și sare peste prag), cu nutriție din poză dacă lipsește în OFF
2. porția față de valoarea zilnică de referință
3. explicații la tap pe ingrediente (abordarea hibridă, mai jos)
4. jurnal de consum (temporizarea reală)

**Licență:**
- conturi + login, profil pe server, eventual discriminatorul mutat în backend (tabelul de reguli se păstrează, se rescrie doar funcția care îl aplică)
- jurnal de consum complet, cu istoric și statistici
- analize medicale (upload buletin, extragere valori, confirmare user, valori marcate după intervalul de pe buletin)
- interacțiuni aliment-medicament
- frontend web
- validarea tabelului de reguli de un nutriționist / cadru de la UMF Timișoara
- baza de produse comună, cu confirmări de la mai mulți useri și dată pe fiecare produs
- capitol GDPR, capitol de evaluare

## Puncte de extensie

Fiecare extensie: ce este și **ce nu trebuie să blocheze codul de acum**. Doar astea sunt locurile unde codul de acum lasă loc pentru viitor.

| Extensie | Ce trebuie să rămână posibil acum |
|---|---|
| afecțiuni noi | registrul de module: rânduri noi în tabelul de reguli, motorul neschimbat |
| analize medicale, medicamente | regulile se evaluează după `type`, printr-o hartă de evaluatori; tip nou = evaluator nou |
| jurnal de consum / temporizare | entitate separată; istoricul de scanări **nu** primește câmpuri de consum acum |
| login și profil pe server | discriminatorul rămâne funcție pură, fără dependențe de React; backend-ul de laborator **nu** primește date de sănătate |
| explicații la tap pe ingrediente | vezi mai jos |

## Idee amânată: detalii la tap pe ingrediente

Dacă rămâne timp. Abordarea **hibridă**:
- **Aditivi (coduri E)**: din surse oficiale; taxonomia de aditivi OFF (nume în mai multe limbi, clasă funcțională, legături Wikidata / EFSA).
- **Restul ingredientelor**: Gemini, **o singură dată per ingredient**, salvat în backend (entitate `Ingredient`, cu CRUD) și refolosit pentru toți userii; corectabil de mână. La Gemini pleacă doar numele ingredientului.
- Ingredientele banale (apă, sare, zahăr) nu sunt clickabile.
- **Partea grea: parserul** de ingrediente (virgule care respectă parantezele imbricate, procente scoase, clasa funcțională separată de ingredient) + nume canonic („acid citric” = „E330” = „citric acid”). Funcție pură, testată pe fixtures; poate ajuta și discriminatorul să arate exact ingredientul care a declanșat regula.
- Pe ecran: ce este, din ce se obține (vegetal / animal / sintetic; ex. E120 din insecte, relevant la vegan), la ce folosește, de ce e evidențiat pentru tine, sursa („generat automat” când vine de la AI). Ton: ce spun sursele oficiale, nu „periculos” / „sigur”.

## Jurnal de consum (temporizarea reală)

Userul apasă „am consumat”, aplicația adună zahărul / sarea pe zi și avertizează aproape de limită. Entitate separată de istoricul de scanări.

## Date de la retaileri (în așteptare)

- Mail trimis la Lidl (serviciu clienți): cerere pentru un eșantion de produse, scop academic, în lucrare doar rezultate agregate. Așteptări mici; **proiectul nu depinde de răspuns**.
- Alternative: producători direct (Vel Pitar, Zuzu, SanoVita), supermarketuri online (Freshful, Carrefour, Auchan, Mega Image), oameni din QA Lidl pe LinkedIn, contribuții la OFF.
- Fără scraping. NDA: nu se semnează fără verificarea că rezultatele agregate pot fi publicate.
- Dacă vin date: încă un adaptor / import în baza din backend.

## Planul de lucru

Principiu: **skateboard → trotinetă → bicicletă → mașină**. La fiecare pas există ceva care merge cap-coadă.

0. **Validare**: ✅ Open Food Facts (19 produse) · ✅ test Gemini pe ingrediente · ⏳ test Gemini pe nutriție (amânat; înainte de `/api/labels/nutrition` și de modulele de afecțiuni)
1. **Cerințe**: user stories, prioritizare (Must / Should / Could / Won't), diagrama de use case
2. **Design**: ✅ diagrama de flux (v5) · ✅ wireframe rezultat · ⏳ wireframe confirmare text AI · ✅ modelul de date (`Product` în `api.md`) · ✅ contractul API (`docs/api.md`)
3. **Setup**: ✅ repo + structura de foldere · ✅ Expo și Spring Boot generate · ✅ `CLAUDE.md` + documentele din `docs/` · ✅ Postgres în Docker pornit și backend-ul conectat · ✅ Expo rulat pe iPhone
4. **Implementare pe felii**: cod de bare → OFF → nume pe ecran; profil + discriminator; backend CRUD; poză + Gemini; istoric; UI final; module de afecțiuni
5. **Testare**: teste unitare pe `evaluate` și pe adaptoare (pe fixtures)
6. **Finalizare**: diagrame actualizate (copia curată a diagramei de flux), capturi, demo pregătit (produse testate, istoric offline, hotspot)

### Pași următori, în ordine

1. ✅ **Contractul API** (`docs/api.md`).
2. **Task-urile** în `docs/tasks/`: primele 3-4 detaliate, restul câte un rând.
3. **Primul task de cod**: Expo pe iPhone, camera → codul de bare pe ecran.
4. Apoi: cod → OFF → nume pe ecran (adaptor testat pe fixtures) → backend CRUD → profil + discriminator → fluxul cu poză → istoric → UI final → module de afecțiuni.

În paralel: wireframe-ul pentru confirmarea textului citit de AI, actualizarea `specificatie-aplicatie.md`.

## Întrebări deschise

- Câmpurile de porție în OFF v3.6 (`serving_size`, `serving_quantity`, `product_quantity`) pe mai multe produse
- Pot porni licența de la proiectul de laborator? (coordonatorul)
- Termenii nivelului gratuit Gemini API pentru datele trimise
- Timpii Gemini cu thinking low (și dacă 3.8 Flash rămâne pe nivelul gratuit)
- Testul de nutriție: alegerea coloanei (100 g / porție / preparat), valori cu „<”, tabel tăiat
- Termenul de predare al laboratorului
- Numele final al aplicației („IngrediScan” e provizoriu)
- Răspunsul de la Lidl
