#!/usr/bin/env python3
"""Fabrique les 4 cassettes du « Labo audio » (dictaphone de Madeleine).

Chaque cassette cache un chiffre du coffre, abîmé d'une façon différente :
  1. à l'envers                      → bouton « À l'envers »
  2. enregistrée 3 fois trop vite    → vitesse ×0,33
  3. couverte par « l'entité »       → filtre « Aigus »
     (une voix grave et forte qui donne un FAUX chiffre ; Madeleine chuchote le vrai dans les aigus)
  4. les trois à la fois (×2)        → à l'envers + vitesse ×0,5 + filtre « Aigus »
     (l'entité y ment aussi)

Il faut : Python 3 avec piper-tts, numpy et scipy.
Les cassettes sont en WAV et non en MP3 : la compression MP3 efface justement
ce que l'oreille n'entend pas, donc la voix cachée sous le grondement.
    python3 -m venv /tmp/venv-audio
    /tmp/venv-audio/bin/pip install piper-tts numpy scipy
    /tmp/venv-audio/bin/python fabriquer_sons.py --voix /chemin/fr_FR-siwis-medium.onnx

La voix « siwis » (Piper, jeu de données SIWIS, licence CC-BY 4.0) se télécharge sur
https://huggingface.co/rhasspy/piper-voices/tree/main/fr/fr_FR/siwis/medium

Avec --solutions, le script écrit aussi à côté les versions « remises en état »
(ce que le joueur doit obtenir), pour vérifier l'énigme à l'oreille ou par transcription.
"""

from __future__ import annotations

import argparse
import wave
from fractions import Fraction
from pathlib import Path

import numpy as np
from scipy import signal

TAUX = 44_100  # Hz, fréquence d'échantillonnage des fichiers produits
DOSSIER_SONS = Path(__file__).resolve().parent.parent / "sons"

CASSETTES = [
    {
        "fichier": "cassette-1.wav",
        "texte": "Si quelqu'un m'entend... Premier chiffre : sept. Je répète : sept.",
        "envers": True,
        "vitesse": 1.0,
    },
    {
        "fichier": "cassette-2.wav",
        "texte": "Ils écoutent. Je dois parler vite. Le deuxième chiffre est quatre.",
        "envers": False,
        "vitesse": 3.0,
    },
    {
        "fichier": "cassette-3.wav",
        "texte": "Ne l'écoute pas. Écoute-moi. Le troisième chiffre est deux. Deux.",
        "envers": False,
        "vitesse": 1.0,
        # L'entité : une voix grave, lente et forte, qui ment.
        "leurre": "Le troisième chiffre... est cinq. Cinq. Cinq.",
        "leurre_db": 32,
        "grondement_db": 8,
    },
    {
        "fichier": "cassette-4.wav",
        "texte": "Dernier chiffre : neuf. Ouvre le coffre... et ne te retourne pas.",
        "envers": True,
        "vitesse": 2.0,
        "leurre": "Dernier chiffre... un. Un. Un.",
        "leurre_db": 32,
        "grondement_db": 8,
    },
]

# Ce que Madeleine cache ne garde que les aigus ; l'entité et le grondement n'occupent que les graves.
COUPURE_VOIX_HZ = 1_700
COUPURE_ENTITE_HZ = 1_150
COUPURE_GRAVES_HZ = 900


def synthetiser(voix, texte: str) -> np.ndarray:
    from piper import SynthesisConfig

    config = SynthesisConfig(length_scale=1.12, noise_scale=0.6, noise_w_scale=0.7)
    morceaux = list(voix.synthesize(texte, syn_config=config))
    taux_voix = morceaux[0].sample_rate
    audio = np.concatenate([m.audio_float_array for m in morceaux]).astype(np.float64)
    return signal.resample_poly(audio, TAUX, taux_voix)


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(x**2)) + 1e-12)


def filtre(x: np.ndarray, type_: str, frequence: float, ordre: int = 8) -> np.ndarray:
    sos = signal.butter(ordre, frequence, btype=type_, fs=TAUX, output="sos")
    return signal.sosfiltfilt(sos, x)


def accelerer(x: np.ndarray, facteur: float) -> np.ndarray:
    """Comme une bande lue trop vite : plus court ET plus aigu."""
    if facteur == 1.0:
        return x
    rapport = Fraction(facteur).limit_denominator(100)
    return signal.resample_poly(x, rapport.denominator, rapport.numerator)


def souffle_de_bande(n: int, rng: np.random.Generator) -> np.ndarray:
    blanc = rng.standard_normal(n)
    return filtre(blanc, "bandpass", (300, 9_000), ordre=2) * 0.012


def grondement(n: int, rng: np.random.Generator) -> np.ndarray:
    """Bruit grave et ronflement électrique, qui couvrent la voix sans la toucher."""
    t = np.arange(n) / TAUX
    bruit = filtre(rng.standard_normal(n), "bandpass", (120, COUPURE_GRAVES_HZ), ordre=6)
    bruit /= rms(bruit)
    ronflement = sum(np.sin(2 * np.pi * 50 * k * t) / k for k in (1, 2, 3, 5, 7))
    ronflement /= rms(ronflement)
    houle = 0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t)  # le grondement respire lentement
    total = (bruit * 0.8 + ronflement * 0.5) * houle
    # Sécurité : rien au-dessus de la coupure, pour que le filtre « Aigus » le fasse disparaître.
    return filtre(total, "lowpass", COUPURE_GRAVES_HZ, ordre=8)


def voix_de_l_entite(voix, texte: str) -> np.ndarray:
    """Plus lente et plus grave (bande ralentie), sans aucun aigu."""
    entite = accelerer(synthetiser(voix, texte), 0.84)
    entite = filtre(entite, "lowpass", COUPURE_ENTITE_HZ)
    return entite / np.max(np.abs(entite))


def ajuster(x: np.ndarray, n: int) -> np.ndarray:
    return np.pad(x, (0, max(0, n - len(x))))[:n]


def fabriquer(cassette: dict, voix, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    """Renvoie (cassette abîmée, cassette remise en état)."""
    cachee = "leurre" in cassette or "grondement_db" in cassette
    parole = synthetiser(voix, cassette["texte"])
    if cachee:
        parole = filtre(parole, "highpass", COUPURE_VOIX_HZ)
    parole /= np.max(np.abs(parole))

    silence = lambda s: np.zeros(int(s * TAUX))
    parole = np.concatenate([silence(0.6), parole, silence(0.8)])

    # L'entité parle en même temps que Madeleine, beaucoup plus fort.
    if "leurre" in cassette:
        entite = np.concatenate([silence(0.3), voix_de_l_entite(voix, cassette["leurre"]), silence(0.5)])
        n = max(len(parole), len(entite))
        parole, entite = ajuster(parole, n), ajuster(entite, n)
        parole = parole + entite * rms(parole) / rms(entite) * 10 ** (cassette["leurre_db"] / 20)

    # 1. La bande est enregistrée trop vite.
    abimee = accelerer(parole, cassette["vitesse"])
    # 2. Le grondement s'ajoute à la vitesse « de la bande ».
    if "grondement_db" in cassette:
        g = grondement(len(abimee), rng)
        g *= rms(abimee) / rms(g) * 10 ** (cassette["grondement_db"] / 20)
        abimee = abimee + g
    abimee = abimee + souffle_de_bande(len(abimee), rng)
    # 3. La bande est rembobinée à l'envers.
    if cassette["envers"]:
        abimee = abimee[::-1]
    abimee *= 0.89 / np.max(np.abs(abimee))

    # Ce que le joueur doit obtenir avec les bons réglages.
    reparee = abimee[::-1] if cassette["envers"] else abimee
    reparee = accelerer(reparee, 1 / cassette["vitesse"]) if cassette["vitesse"] != 1 else reparee
    if cachee:
        reparee = filtre(reparee, "highpass", COUPURE_VOIX_HZ)
    reparee = reparee * 0.89 / np.max(np.abs(reparee))
    return abimee, reparee


def ecrire_wav(audio: np.ndarray, chemin: Path) -> None:
    with wave.open(str(chemin), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(TAUX)
        wf.writeframes((np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes())


def main() -> None:
    parseur = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parseur.add_argument("--voix", required=True, help="modèle Piper .onnx (fr_FR-siwis-medium)")
    parseur.add_argument("--solutions", help="dossier où écrire les versions remises en état (WAV)")
    args = parseur.parse_args()

    from piper import PiperVoice

    voix = PiperVoice.load(args.voix)
    rng = np.random.default_rng(13)  # même graine = mêmes cassettes à chaque fabrication
    DOSSIER_SONS.mkdir(exist_ok=True)

    for cassette in CASSETTES:
        abimee, reparee = fabriquer(cassette, voix, rng)
        ecrire_wav(abimee, DOSSIER_SONS / cassette["fichier"])
        print(f"✅ {cassette['fichier']} ({len(abimee) / TAUX:.1f} s)")
        if args.solutions:
            dossier = Path(args.solutions)
            dossier.mkdir(parents=True, exist_ok=True)
            ecrire_wav(reparee, dossier / cassette["fichier"].replace(".wav", "-reparee.wav"))

if __name__ == "__main__":
    main()
