# Bidouille en ligne 🧪

Mon labo d'idées : de petites expériences rapides pour tester des idées, puis développer celles qui marchent.

**La vitrine : https://samagie.github.io/Bidouille-en-ligne/** (toutes les expériences, les démos en un clic)

## Les expériences

<!-- Ce tableau est généré par `python3 outils/labo.py index` : ne pas le modifier à la main. -->
<!-- DEBUT-SOMMAIRE -->
| N° | Expérience | Statut | En une phrase | Démo |
|---|---|---|---|---|
| 003 | [Chasseur de bonnes affaires](experiences/003-chasseur-de-bonnes-affaires/) | 🧪 En cours | Trouver sur Leboncoin, Vinted et eBay les appareils en panne faciles à réparer, et savoir en un coup d'œil si une annonce est une affaire. | [Ouvrir](https://samagie.github.io/Bidouille-en-ligne/experiences/003-chasseur-de-bonnes-affaires/) |
| 002 | [Rappel de la semaine (Chez Miaouss)](experiences/002-rappel-de-la-semaine/) | 🧪 En cours | Le journal de la semaine de Mimi en story animée, avec 5 modèles qui tournent, des modèles de saison, la comparaison avec la semaine d'avant et des réactions. | [Ouvrir](https://samagie.github.io/Bidouille-en-ligne/experiences/002-rappel-de-la-semaine/) |
| 001 | [Le dictaphone de Madeleine](experiences/001-labo-audio/) | 🧪 En cours | Quatre cassettes abîmées à remettre en état (à l'envers, trop vite, couvertes par une autre voix) pour trouver le code d'un coffre. | [Ouvrir](https://samagie.github.io/Bidouille-en-ligne/experiences/001-labo-audio/) |
<!-- FIN-SOMMAIRE -->

## Comment ça marche

```
IDEES.md  ──►  🧪 En cours  ──►  ⭐ Prometteur  ──►  🚀 Promu (part dans son propre dépôt)
                    │                  │
                    └──► ⏸️ En pause / ❌ Abandonné (on garde la trace et ce qu'on a appris)
```

| Statut | Ce que ça veut dire |
|---|---|
| 🧪 En cours | On est en train de l'essayer. |
| ⭐ Prometteur | Ça marche, l'idée mérite d'aller plus loin. |
| ⏸️ En pause | On s'arrête là pour l'instant, on y reviendra peut-être. |
| ❌ Abandonné | Ça ne marche pas ou ça n'intéresse plus. On garde ce qu'on a appris. |
| 🚀 Promu | L'idée est développée pour de vrai, dans son propre dépôt. |

1. Une idée en vrac va dans la [boîte à idées](IDEES.md).
2. Quand on la lance, elle reçoit son dossier `experiences/NNN-nom/` avec une fiche (`README.md`) et, si c'est du web, une page `index.html`.
3. À chaque fusion dans `main`, la vitrine se met à jour toute seule.

## Rangement

```
├── README.md            ← ce fichier (sommaire automatique)
├── CLAUDE.md            ← les règles du labo pour Claude
├── IDEES.md             ← la boîte à idées
├── index.html           ← la vitrine
├── experiences.json     ← la liste des expériences (générée)
├── experiences/
│   ├── _modele/         ← le modèle copié pour chaque nouvelle expérience
│   └── NNN-nom-court/   ← une expérience = un dossier autonome
├── outils/labo.py       ← crée une expérience, met à jour le sommaire
└── .github/workflows/   ← publication automatique de la vitrine
```

## Commandes utiles

```bash
python3 outils/labo.py nouvelle "Titre de l'expérience"   # crée une expérience
python3 outils/labo.py index                             # met à jour le sommaire et la vitrine
python3 -m http.server                                   # voir la vitrine en local : http://localhost:8000
```
