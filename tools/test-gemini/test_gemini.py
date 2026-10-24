#!/usr/bin/env python3
"""IngrediScan, faza 0: test Gemini pe etichete (ingrediente si tabel nutritional).

Utilizare:
  python test_gemini.py                        # ingrediente, toate produsele din poze/
  python test_gemini.py snickers               # ingrediente, doar poze/snickers/
  python test_gemini.py --tip nutritie         # tabel nutritional, tot din poze_nutritie/
  python test_gemini.py iaurt --tip nutritie   # doar poze_nutritie/iaurt/
  python test_gemini.py --cod 59412...         # testul pe cod de bare, cu un cod dat
  python test_gemini.py --cod inventat         # EAN-13 valid, dar inexistent

Locatie in repo: tools/test-gemini/. Prompturile si schemele se citesc din backend/src/main/resources/gemini/,
rezultatele se scriu in fixtures/gemini/.
Structura pozelor: <folder>/<produs>/<1-3 poze>. Toate pozele dintr-un folder = acelasi produs.
"""
import argparse
import json
import random
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

MODEL = "gemini-3.6-flash"
THINKING = "medium"  # low / medium / high
RULARI = 2  # temperature e ignorat la 3.x, deci verificam consecventa rulând de 2 ori

DIR = Path(__file__).parent
RADACINA = DIR.parent.parent  # radacina repo-ului (tools/test-gemini -> ingrediscan)
REZULTATE = RADACINA / "fixtures" / "gemini"
PROMPTURI = RADACINA / "backend" / "src" / "main" / "resources" / "gemini"
MIME = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".heic": "image/heic", ".heif": "image/heif",  # iPhone salveaza HEIC
}

load_dotenv(RADACINA / "backend" / ".env")

TIPURI = {
    "ingrediente": {
        "prompt": "prompt.txt", "schema": "schema.json", "poze": "poze",
        "mesaj": "Transcrie lista de ingrediente din aceste poze.",
        "rezumat": lambda o: (f"limba={o['limba']} | complet={o['text_complet']} "
                              f"| ilizibile={len(o['zone_ilizibile'])} | evidentiati={o['alergeni_evidentiati']}"),
    },
    "nutritie": {
        "prompt": "prompt_nutritie.txt", "schema": "schema_nutritie.json", "poze": "poze_nutritie",
        "mesaj": "Transcrie tabelul nutrițional din aceste poze.",
        "rezumat": lambda o: (f"coloana={o['coloana']}/{o['preparare']} | complet={o['tabel_complet']} "
                              f"| ilizibile={len(o['zone_ilizibile'])} | zaharuri={o['zaharuri']!r} | sare={o['sare']!r}"),
    },
}

client = genai.Client(http_options=types.HttpOptions(timeout=90_000))  # ia cheia din GEMINI_API_KEY; timeout in ms


def citeste(tip, poze):
    cfg = TIPURI[tip]
    parts = [types.Part.from_bytes(data=p.read_bytes(), mime_type=MIME[p.suffix.lower()]) for p in poze]
    parts.append(cfg["mesaj"])
    config = types.GenerateContentConfig(
        system_instruction=(PROMPTURI / cfg["prompt"]).read_text(encoding="utf-8"),
        response_mime_type="application/json",
        response_json_schema=json.loads((PROMPTURI / cfg["schema"]).read_text(encoding="utf-8")),
        thinking_config=types.ThinkingConfig(thinking_level=THINKING),
    )
    t0 = time.time()
    r = client.models.generate_content(model=MODEL, contents=parts, config=config)
    return json.loads(r.text), round(time.time() - t0, 1), r.usage_metadata.thoughts_token_count


def ruleaza(tip, doar=None):
    cfg = TIPURI[tip]
    folder = DIR / cfg["poze"]
    if not folder.is_dir():
        print(f"Lipseste folderul {cfg['poze']}/")
        return
    REZULTATE.mkdir(parents=True, exist_ok=True)
    produse = sorted(d for d in folder.iterdir() if d.is_dir())
    if doar:
        produse = [d for d in produse if d.name == doar]
    if not produse:
        print(f"Niciun produs gasit in {cfg['poze']}/")
        return
    for d in produse:
        poze = sorted(p for p in d.iterdir() if p.suffix.lower() in MIME)
        if not poze:
            print(f"{d.name}: nicio poza, sar peste")
            continue
        for i in range(1, RULARI + 1):
            print(f"{d.name} #{i}: trimit {len(poze)} poze...", flush=True)
            try:
                out, sec, gand = citeste(tip, poze)
            except Exception as e:
                print(f"{d.name} #{i}: EROARE {e}")
                continue
            rez = {"model": MODEL, "tip": tip, "thinking": THINKING, "tokeni_gandire": gand,
                   "produs": d.name, "rulare": i, "poze": [p.name for p in poze],
                   "secunde": sec, "raspuns": out}
            (REZULTATE / f"{tip}_{d.name}_{MODEL}_{THINKING}_run{i}.json").write_text(
                json.dumps(rez, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"{d.name} #{i}: {sec}s, {gand} tokeni gandire | {cfg['rezumat'](out)}")


def cod_valid_inventat():
    # prefix 594 = Romania; cifra de control EAN-13: ponderi 1,3,1,3... pe primele 12 cifre
    cifre = [5, 9, 4] + [random.randint(0, 9) for _ in range(9)]
    suma = sum(c * (3 if i % 2 else 1) for i, c in enumerate(cifre))
    return "".join(map(str, cifre)) + str((10 - suma % 10) % 10)


def intreaba_cod(cod):
    # fara schema, fara system instruction: vrem sa vedem daca inventeaza un produs
    REZULTATE.mkdir(parents=True, exist_ok=True)
    intrebare = f"Ce produs are codul de bare {cod}? Spune numele, producătorul și lista de ingrediente."
    r = client.models.generate_content(model=MODEL, contents=intrebare)
    (REZULTATE / f"cod_{cod}.txt").write_text(f"{intrebare}\n\n{r.text}", encoding="utf-8")
    print(f"Cod: {cod}\n\n{r.text}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Test Gemini pe etichete (IngrediScan)")
    ap.add_argument("produs", nargs="?", help="numele subfolderului; fara el ruleaza tot")
    ap.add_argument("--tip", choices=list(TIPURI), default="ingrediente")
    ap.add_argument("--cod", help="cod de bare sau 'inventat'")
    a = ap.parse_args()
    if a.cod:
        intreaba_cod(cod_valid_inventat() if a.cod == "inventat" else a.cod)
    else:
        ruleaza(a.tip, a.produs)
