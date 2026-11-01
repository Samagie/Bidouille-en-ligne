#!/usr/bin/env python3
"""Petit outil du labo « Bidouille en ligne ».

Commandes :
    python3 outils/labo.py nouvelle "Titre de l'expérience"
        Crée experiences/NNN-titre-de-l-experience/ à partir du modèle,
        puis met à jour le sommaire.

    python3 outils/labo.py index
        Relit toutes les fiches (experiences/*/README.md) et régénère
        experiences.json (lu par la vitrine) et le tableau du README.md.

Aucune dépendance : uniquement la bibliothèque standard de Python.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DOSSIER_EXPERIENCES = RACINE / "experiences"
DOSSIER_MODELE = DOSSIER_EXPERIENCES / "_modele"
FICHIER_JSON = RACINE / "experiences.json"
FICHIER_README = RACINE / "README.md"

DEPOT = "Samagie/Bidouille-en-ligne"
URL_DEPOT = f"https://github.com/{DEPOT}"
URL_SITE = "https://samagie.github.io/Bidouille-en-ligne/"

MARQUEUR_DEBUT = "<!-- DEBUT-SOMMAIRE -->"
MARQUEUR_FIN = "<!-- FIN-SOMMAIRE -->"

# Ordre = ordre d'affichage des filtres dans la vitrine.
STATUTS = [
    {"cle": "en-cours", "libelle": "En cours", "emoji": "🧪"},
    {"cle": "prometteur", "libelle": "Prometteur", "emoji": "⭐"},
    {"cle": "en-pause", "libelle": "En pause", "emoji": "⏸️"},
    {"cle": "abandonne", "libelle": "Abandonné", "emoji": "❌"},
    {"cle": "promu", "libelle": "Promu", "emoji": "🚀"},
]
STATUTS_PAR_CLE = {s["cle"]: s for s in STATUTS}

MOTIF_DOSSIER = re.compile(r"^(\d{3})-[a-z0-9-]+$")


def sans_accents(texte: str) -> str:
    decompose = unicodedata.normalize("NFKD", texte)
    return "".join(c for c in decompose if not unicodedata.combining(c))


def en_slug(texte: str, longueur_max: int = 40) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", sans_accents(texte).lower()).strip("-")
    slug = slug[:longueur_max].strip("-")
    return slug or "experience"


def cle_statut(texte: str) -> str:
    return en_slug(texte)


def lire_entete(fiche: Path) -> dict[str, str]:
    """Lit l'en-tête « --- cle: valeur --- » en haut d'une fiche."""
    lignes = fiche.read_text(encoding="utf-8").splitlines()
    if not lignes or lignes[0].strip() != "---":
        return {}
    entete: dict[str, str] = {}
    for ligne in lignes[1:]:
        if ligne.strip() == "---":
            return entete
        if ":" in ligne:
            cle, valeur = ligne.split(":", 1)
            entete[cle.strip().lower()] = valeur.strip()
    return {}  # en-tête jamais refermé : on l'ignore


def dossiers_experiences() -> list[Path]:
    if not DOSSIER_EXPERIENCES.is_dir():
        return []
    return sorted(
        d for d in DOSSIER_EXPERIENCES.iterdir() if d.is_dir() and MOTIF_DOSSIER.match(d.name)
    )


def collecter() -> tuple[list[dict], list[str]]:
    experiences: list[dict] = []
    avertissements: list[str] = []
    for dossier in dossiers_experiences():
        fiche = dossier / "README.md"
        if not fiche.is_file():
            avertissements.append(f"{dossier.name} : pas de README.md, expérience ignorée.")
            continue
        entete = lire_entete(fiche)
        if not entete:
            avertissements.append(f"{dossier.name} : en-tête « --- … --- » absent ou mal fermé.")

        statut_brut = entete.get("statut", "en cours")
        statut = STATUTS_PAR_CLE.get(cle_statut(statut_brut))
        if statut is None:
            avertissements.append(
                f"{dossier.name} : statut inconnu « {statut_brut} » "
                f"(attendu : {', '.join(s['libelle'].lower() for s in STATUTS)})."
            )
            statut = STATUTS_PAR_CLE["en-cours"]

        tags = [t.strip() for t in entete.get("tags", "").split(",") if t.strip()]
        a_une_demo = (dossier / "index.html").is_file()
        experiences.append(
            {
                "numero": MOTIF_DOSSIER.match(dossier.name).group(1),
                "dossier": dossier.name,
                "titre": entete.get("titre") or dossier.name,
                "statut": statut["cle"],
                "date": entete.get("date", ""),
                "resume": entete.get("resume", ""),
                "tags": tags,
                "demo": f"experiences/{dossier.name}/" if a_une_demo else None,
                "fiche": f"{URL_DEPOT}/tree/main/experiences/{dossier.name}",
            }
        )
    experiences.sort(key=lambda e: e["numero"], reverse=True)
    return experiences, avertissements


def cellule(texte: str) -> str:
    return texte.replace("|", "\\|").replace("\n", " ")


def tableau_markdown(experiences: list[dict]) -> str:
    if not experiences:
        return "_Aucune expérience pour l'instant._"
    lignes = [
        "| N° | Expérience | Statut | En une phrase | Démo |",
        "|---|---|---|---|---|",
    ]
    for e in experiences:
        statut = STATUTS_PAR_CLE[e["statut"]]
        demo = f"[Ouvrir]({URL_SITE}{e['demo']})" if e["demo"] else "—"
        lignes.append(
            f"| {e['numero']} "
            f"| [{cellule(e['titre'])}](experiences/{e['dossier']}/) "
            f"| {statut['emoji']} {statut['libelle']} "
            f"| {cellule(e['resume'])} "
            f"| {demo} |"
        )
    return "\n".join(lignes)


def mettre_a_jour_readme(experiences: list[dict]) -> bool:
    if not FICHIER_README.is_file():
        return False
    contenu = FICHIER_README.read_text(encoding="utf-8")
    debut = contenu.find(MARQUEUR_DEBUT)
    fin = contenu.find(MARQUEUR_FIN)
    if debut == -1 or fin == -1 or fin < debut:
        return False
    nouveau = (
        contenu[: debut + len(MARQUEUR_DEBUT)]
        + "\n"
        + tableau_markdown(experiences)
        + "\n"
        + contenu[fin:]
    )
    if nouveau != contenu:
        FICHIER_README.write_text(nouveau, encoding="utf-8")
    return True


def commande_index() -> int:
    experiences, avertissements = collecter()
    donnees = {"statuts": STATUTS, "experiences": experiences}
    FICHIER_JSON.write_text(
        json.dumps(donnees, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    if not mettre_a_jour_readme(experiences):
        avertissements.append(
            f"README.md : marqueurs {MARQUEUR_DEBUT} / {MARQUEUR_FIN} introuvables, tableau non mis à jour."
        )
    for message in avertissements:
        print(f"⚠️  {message}", file=sys.stderr)
    print(f"✅ Sommaire à jour : {len(experiences)} expérience(s).")
    return 0


def commande_nouvelle(titre: str) -> int:
    titre = " ".join(titre.split())
    if not titre:
        print("❌ Donne un titre, par exemple : labo.py nouvelle \"Minuteur pomodoro\"", file=sys.stderr)
        return 1
    if not DOSSIER_MODELE.is_dir():
        print(f"❌ Modèle introuvable : {DOSSIER_MODELE}", file=sys.stderr)
        return 1

    numeros = [int(MOTIF_DOSSIER.match(d.name).group(1)) for d in dossiers_experiences()]
    numero = f"{max(numeros, default=0) + 1:03d}"
    dossier = DOSSIER_EXPERIENCES / f"{numero}-{en_slug(titre)}"

    shutil.copytree(DOSSIER_MODELE, dossier)
    remplacements = {
        "{{TITRE}}": titre,
        "{{DATE}}": dt.date.today().isoformat(),
        "{{DOSSIER}}": dossier.name,
        "{{NUMERO}}": numero,
    }
    for fichier in dossier.rglob("*"):
        if fichier.suffix in {".md", ".html", ".css", ".js", ".txt", ".json", ".py"}:
            texte = fichier.read_text(encoding="utf-8")
            for ancien, nouveau in remplacements.items():
                texte = texte.replace(ancien, nouveau)
            fichier.write_text(texte, encoding="utf-8")

    print(f"🧪 Nouvelle expérience : experiences/{dossier.name}/")
    return commande_index()


def main() -> int:
    parseur = argparse.ArgumentParser(description="Outil du labo Bidouille en ligne.")
    sous = parseur.add_subparsers(dest="commande", required=True)
    p_nouvelle = sous.add_parser("nouvelle", help="créer une nouvelle expérience")
    p_nouvelle.add_argument("titre", help="titre de l'expérience, entre guillemets")
    sous.add_parser("index", help="mettre à jour experiences.json et le sommaire du README")
    args = parseur.parse_args()

    if args.commande == "nouvelle":
        return commande_nouvelle(args.titre)
    return commande_index()


if __name__ == "__main__":
    sys.exit(main())
