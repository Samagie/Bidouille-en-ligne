---
titre: Anglais intensif
statut: en cours
date: 2026-11-07
resume: Une séance d'anglais de 25 minutes par jour, en 5 stations (vocabulaire, grammaire, conjugaison, bases, diction), sur téléphone et iPad.
tags: web, apprentissage, voix
---

# Anglais intensif (« Mind the Gap »)

<!--
  L'en-tête ci-dessus (entre les ---) alimente la vitrine et le sommaire.
  statut : en cours | prometteur | en pause | abandonné | promu
  tags   : mots séparés par des virgules (ex. web, ia, jeu)
-->

## 💡 L'idée

Une idée d'Ivan : une appli pour apprendre l'anglais de façon intensive, 20 à 30 minutes par jour, sur téléphone et iPad. Chaque jour, une séance complète avec du vocabulaire, de la grammaire, de la conjugaison, des bases de la langue et de la diction.

La séance du jour est dessinée comme une **ligne de métro** : 5 stations de couleur à parcourir, environ 25 minutes en tout.

| Station | Durée | Ce qu'on y fait |
|---|---|---|
| Vocabulaire | 6 min | 8 mots du thème du jour en cartes (écouter, retourner, « je savais » ou « à revoir »), puis un petit quiz. Les mots « à revoir » des jours précédents reviennent en révision. |
| Grammaire | 6 min | Une règle courte avec ses pièges, des exemples à écouter, puis 5 phrases à trou. |
| Conjugaison | 4 min | 4 verbes irréguliers à apprendre, puis 6 phrases où l'on tape la bonne forme. |
| Les bases | 3 min | Faux amis, l'heure, make ou do, in/on/at, pluriels irréguliers. |
| Diction | 6 min | Un son du jour (TH, H soufflé, ship ou sheep…), puis 4 phrases : on écoute (normal ou lent), on répète au micro, et l'appli colore les mots reconnus. |

Le prototype contient la **première semaine** : 5 jours, 40 mots, 20 verbes irréguliers. Il compte aussi le temps passé, les jours d'affilée et les mots retenus.

## 🎯 Ce qu'on veut vérifier

- Une séance de 25 minutes découpée en stations donne-t-elle envie de revenir chaque jour ?
- La diction au micro (reconnaissance de la voix du navigateur) est-elle assez fiable pour être utile ?
- Le mélange des 5 types d'exercices est-il le bon, ou faut-il en enlever ou en ajouter ?

## ▶️ Comment l'essayer

- En ligne : https://samagie.github.io/Bidouille-en-ligne/experiences/003-anglais-intensif/
- En local : ouvrir `index.html` dans un navigateur.
- Sur iPhone ou iPad : ouvrir le lien dans Safari, puis **Partager → Sur l'écran d'accueil** pour l'avoir comme une appli.
- Le micro marche dans Chrome (Android, ordinateur) et Safari (iPhone, iPad). Sans micro, on écoute, on répète à voix haute et on se note soi-même.
- La progression reste dans le navigateur de l'appareil (rien n'est envoyé nulle part).

## 📝 Ce qu'on a appris

- Tout tient dans un seul fichier, sans serveur ni clé d'API : la voix anglaise et l'écoute du micro sont fournies par le navigateur.
- La voix dépend de l'appareil : sur iPhone et iPad elle est bonne, sur certains ordinateurs elle est plus robotique.
- (à compléter après les premiers essais avec Ivan)

## ➡️ Prochaine étape

- Faire essayer à Ivan pendant quelques jours, puis décider : continuer, ajuster ou abandonner.
- Pistes si l'idée plaît : un test de niveau au départ, plus de semaines de contenu, une vraie révision espacée des mots, et un retour plus fin sur la prononciation (avec une IA, ce qui demandera de choisir comment gérer la clé).
