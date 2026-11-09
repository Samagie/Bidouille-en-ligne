#!/usr/bin/env python3
"""Télécharge l'historique récent de quelques valeurs de la Bourse (Yahoo Finance)
et l'enregistre dans bourse.json, que la page lit pour « La course en Bourse ».

Pourquoi un fichier ? Yahoo ne laisse pas une page web lire ses cours
directement : on les télécharge donc ici, puis on les range dans le labo.

Usage (depuis n'importe où) :
    python3 experiences/003-robot-de-trading-fictif/maj_bourse.py

Aucune dépendance : uniquement la bibliothèque standard de Python.
"""

from __future__ import annotations

import datetime as dt
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

# (code Yahoo, nom affiché, groupe, précision affichée sous le nom)
VALEURS = [
    ("AAPL", "Apple", "us", "AAPL · New York"),
    ("MSFT", "Microsoft", "us", "MSFT · New York"),
    ("NVDA", "Nvidia", "us", "NVDA · New York"),
    ("TSLA", "Tesla", "us", "TSLA · New York"),
    ("AMZN", "Amazon", "us", "AMZN · New York"),
    ("GOOGL", "Google", "us", "GOOGL · New York"),
    ("META", "Meta (Facebook)", "us", "META · New York"),
    ("MC.PA", "LVMH", "fr", "MC · Paris"),
    ("TTE.PA", "TotalEnergies", "fr", "TTE · Paris"),
    ("AIR.PA", "Airbus", "fr", "AIR · Paris"),
    ("OR.PA", "L'Oréal", "fr", "OR · Paris"),
    ("^FCHI", "CAC 40", "indice", "les 40 grandes de Paris"),
    ("^GSPC", "S&P 500", "indice", "les 500 grandes américaines"),
]
SEANCES = 5          # nombre de séances complètes gardées pour la course
ECHAUFFEMENT = 40    # bougies gardées avant, pour que les indicateurs soient prêts
URL = "https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=5m&range=1mo"
FICHIER = Path(__file__).resolve().parent / "bourse.json"


def lire(code: str) -> dict:
    requete = urllib.request.Request(
        URL.format(urllib.parse.quote(code)),
        headers={"User-Agent": "Mozilla/5.0 (labo Bidouille en ligne)"},
    )
    with urllib.request.urlopen(requete, timeout=30) as reponse:
        return json.load(reponse)["chart"]["result"][0]


def preparer(code: str, nom: str, groupe: str, detail: str) -> dict:
    res = lire(code)
    meta = res["meta"]
    q = res["indicators"]["quote"][0]
    fuseau = ZoneInfo(meta["exchangeTimezoneName"])
    jour = lambda t: dt.datetime.fromtimestamp(t, fuseau).date().isoformat()  # noqa: E731

    bougies = []
    for i, t in enumerate(res["timestamp"]):
        o, h, l, c = q["open"][i], q["high"][i], q["low"][i], q["close"][i]
        if None in (o, h, l, c):
            continue
        bougies.append([t, round(o, 3), round(h, 3), round(l, 3), round(c, 3)])

    # Une séance en cours est incomplète : on l'écarte.
    seance = meta.get("currentTradingPeriod", {}).get("regular", {})
    if seance and seance["start"] <= time.time() < seance["end"]:
        bougies = [b for b in bougies if b[0] < seance["start"]]

    jours = sorted({jour(b[0]) for b in bougies})[-SEANCES:]
    i0 = next(i for i, b in enumerate(bougies) if jour(b[0]) == jours[0])
    return {
        "code": code,
        "nom": nom,
        "groupe": groupe,
        "detail": detail,
        "devise": meta.get("currency"),
        "debut": bougies[i0][0],
        "seances": jours,
        "bougies": bougies[max(0, i0 - ECHAUFFEMENT):],
    }


def main() -> None:
    valeurs = []
    for code, nom, groupe, detail in VALEURS:
        try:
            valeurs.append(preparer(code, nom, groupe, detail))
            print(f"✅ {nom}")
        except Exception as erreur:  # une valeur en panne ne bloque pas les autres
            print(f"⚠️ {nom} : {erreur}")
        time.sleep(0.5)
    if not valeurs:
        raise SystemExit("Aucune valeur téléchargée : bourse.json n'est pas modifié.")
    seances = sorted({j for v in valeurs for j in v["seances"]})[-SEANCES:]
    donnees = {
        "maj": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "source": "Yahoo Finance",
        "intervalle": "5m",
        "seances": seances,
        "valeurs": valeurs,
    }
    FICHIER.write_text(json.dumps(donnees, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"📦 {FICHIER.name} : {len(valeurs)} valeurs, séances du {seances[0]} au {seances[-1]}.")


if __name__ == "__main__":
    main()
