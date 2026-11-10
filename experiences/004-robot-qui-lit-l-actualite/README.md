---
titre: Robot qui lit l'actualité
statut: en pause
date: 2026-11-10
resume: Un robot de trading prédit-il mieux s'il connaît l'humeur du marché (peur, presse, Wikipédia) ? Test sur des périodes jamais vues.
tags: web, trading, crypto, actualité, étude
---

# Robot qui lit l'actualité

<!--
  L'en-tête ci-dessus (entre les ---) alimente la vitrine et le sommaire.
  statut : en cours | prometteur | en pause | abandonné | promu
  tags   : mots séparés par des virgules (ex. web, ia, jeu)
-->

## 💡 L'idée

Les cours seuls ne permettent pas de prédire (voir l'expérience 003). Un robot fait-il mieux s'il connaît aussi **l'humeur du marché** ? On lui donne trois sources gratuites, sans clé :

- l'indice « peur et avidité » des cryptos (alternative.me) ;
- le ton et le nombre des articles de presse du monde entier (GDELT) ;
- le nombre de visites de la page Wikipédia de chaque crypto.

Chaque soir, une formule simple combine les signaux pour décider si le robot est investi le lendemain. Elle est recalculée tous les 6 mois sur les 2 années précédentes, puis jugée sur les 6 mois suivants, jamais vus. On compare 5 concurrents : cours seuls, humeur seule, cours + humeur, « acheter et attendre », hasard.

## 🎯 Ce qu'on veut vérifier

- L'actualité donne-t-elle un vrai avantage, ou est-elle déjà dans les prix ?

## ▶️ Comment l'essayer

- En ligne : https://samagie.github.io/Bidouille-en-ligne/experiences/004-robot-qui-lit-l-actualite/
- La page affiche les résultats enregistrés dans `resultats.json`.
- Refaire l'étude (il faut numpy ; le téléchargement prend environ une heure, car GDELT et Wikipédia limitent le rythme des demandes) : `python3 experiences/004-robot-qui-lit-l-actualite/etude/telecharger.py`, puis `python3 experiences/004-robot-qui-lit-l-actualite/etude/analyse.py`.

## 📝 Ce qu'on a appris

Étude du 10 novembre 2026 : 10 cryptos, cours journaliers, 13 périodes de 6 mois de mai 2020 à novembre 2026.

- **Non, l'humeur ne permet pas de mieux prédire.** Sur toute la période, « acheter et attendre » finit à +659 %. Aucun robot ne s'en approche :
  - prédiction du lendemain : cours + humeur +105 %, cours seuls +17 %, humeur seule +214 %, hasard +224 % ;
  - prédiction à 7 jours : cours + humeur +14 %, cours seuls +245 %, humeur seule +370 %, hasard +224 %.
- Le robot « cours + humeur » ne bat « acheter et attendre » que 6 fois sur 13 (lendemain) et 3 fois sur 13 (7 jours).
- L'humeur améliore le robot du lendemain (10 périodes sur 13 face aux cours seuls), mais le dégrade à 7 jours (5 sur 13). Un effet qui change de sens selon le réglage n'est pas fiable.
- **Aucun des 14 signaux n'est stable** : ceux qui semblaient prédire avant juin 2022 (peur et avidité, variation sur 30 jours) ne prédisent plus rien après.
- Les robots ne protègent même pas des chutes : leur pire baisse est de −79 % à −85 %, comme « attendre » (−84 %).
- Limites : signaux simples (un ton moyen, pas une vraie lecture des articles), données journalières, 5 à 10 cryptos selon les périodes car certaines pages Wikipédia ont un historique incomplet.

## ➡️ Prochaine étape

- En pause. Les sources gratuites et lentes ne donnent pas d'avantage.
- Si on reprend : faire lire les titres par une IA (payant, en local) ou tester la réaction dans l'heure qui suit une nouvelle, plutôt que le lendemain.
