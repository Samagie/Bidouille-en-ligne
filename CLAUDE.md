# Bidouille en ligne : règles du labo

Ce dépôt est un **labo d'expériences**. Son propriétaire y teste beaucoup de petites idées, vite, depuis une conversation avec Claude, puis développe celles qui marchent.

## Avec qui tu travailles

- Le propriétaire **n'est pas développeur**. Parle-lui en français, simplement, sans jargon (ou explique-le en une phrase).
- Il veut **voir** le résultat. À la fin de chaque tâche, donne :
  - ce qui a été fait, en 2 ou 3 lignes ;
  - le lien de la démo : `https://samagie.github.io/Bidouille-en-ligne/experiences/<dossier>/` ;
  - si possible, une capture d'écran (Playwright est disponible dans l'environnement).
- Va vite : on cherche des idées, pas la perfection. Un prototype qui marche vaut mieux qu'un plan.

## Organisation

```
experiences/NNN-nom-court/   une expérience = un dossier autonome
  README.md                  la fiche (avec un en-tête lu par l'outil)
  index.html                 la démo web (à supprimer si l'expérience n'est pas web)
experiences/_modele/         le modèle, ne pas le modifier pour une expérience précise
IDEES.md                     la boîte à idées (idées pas encore lancées)
index.html                   la vitrine (lit experiences.json)
experiences.json             généré par outils/labo.py, ne pas l'éditer à la main
outils/labo.py               l'outil du labo
```

## Lancer une nouvelle expérience

1. `python3 outils/labo.py nouvelle "Titre lisible"` crée `experiences/NNN-titre-lisible/` à partir du modèle.
2. Remplis l'en-tête de la fiche (`titre`, `statut`, `date`, `resume` en une phrase, `tags` séparés par des virgules) et ses sections.
3. Construis le prototype **dans ce dossier uniquement**.
4. Si l'idée venait de `IDEES.md`, retire-la de là.

## Règles pour les expériences

- **Tout reste dans le dossier de l'expérience.** Pas de code partagé entre expériences, pas de dépendance de l'une à l'autre.
- **Web** : de préférence un `index.html` autonome (HTML, CSS et JS dans le fichier ou à côté), **sans étape de construction**, avec des **liens relatifs** (le site est servi sous `/Bidouille-en-ligne/`). Garde le lien « ← Retour au labo » (`../../`).
- Si une expérience a vraiment besoin d'outils (npm, Python…), écris dans la section « Comment l'essayer » de la fiche comment la lancer.
- **Pas web** (script, données…) : supprime `index.html`. La vitrine n'affichera alors que la fiche.

## Statuts (champ `statut` de la fiche)

`en cours` · `prometteur` · `en pause` · `abandonné` · `promu`

- Change le statut quand le propriétaire le décide ou quand il est évident. Remplis toujours « Ce qu'on a appris ».
- **Promu** : l'idée part dans son propre dépôt. Ajoute le lien de ce dépôt dans la fiche. Le dossier reste dans le labo comme archive.

## Avant chaque commit

```bash
python3 outils/labo.py index
```

Cela met à jour `experiences.json` (la vitrine) et le tableau du `README.md`. Corrige les avertissements ⚠️ s'il y en a.

## Sécurité : le dépôt est PUBLIC

- Jamais de clé d'API, de mot de passe, de jeton ni de donnée personnelle dans un fichier versionné.
- Les secrets vont dans un `.env` (ignoré par git). Fournis un `.env.exemple` sans les vraies valeurs si besoin.
- Une page web publiée ne peut pas cacher une clé : une expérience qui appelle une API payante (Claude, etc.) tourne en local, ou alors on demande au propriétaire comment il veut faire.

## Git : le circuit de chaque tâche

1. **Au début** : si la branche de la session a déjà été fusionnée dans `main`, repars de `main` :
   `git fetch origin main && git checkout -B <branche-de-session> origin/main`
2. Travaille, fais des commits en français et pousse sur la branche de la session.
3. **Quand le propriétaire dit « c'est bon »** (ou valide autrement) :
   - ouvre une Pull Request vers `main` ;
   - fusionne-la toi-même en mode **squash** (un commit par tâche) ;
   - la vitrine est republiée automatiquement environ une minute après. Donne le lien.
4. Ne fusionne pas sans son accord explicite.

## Boîte à idées

Dès que le propriétaire mentionne une idée qu'on ne lance pas tout de suite, ajoute-la à `IDEES.md` en une ligne.
