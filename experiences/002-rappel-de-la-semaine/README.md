---
titre: Rappel de la semaine (Chez Miaouss)
statut: en cours
date: 2026-11-01
resume: Le journal de la semaine de Mimi en version story animée, avec 5 modèles qui tournent chaque semaine pour ne pas se lasser.
tags: web, animation, Chez Miaouss, Mimi
---

# 🐾 Rappel de la semaine : la story de Mimi

<!--
  L'en-tête ci-dessus (entre les ---) alimente la vitrine et le sommaire.
  statut : en cours | prometteur | en pause | abandonné | promu
  tags   : mots séparés par des virgules (ex. web, ia, jeu)
-->

## 💡 L'idée

Chez Miaouss a déjà un **« 📰 Journal de la semaine »** de Mimi (`src/ui/home/weekly.ts`). Il est prêt le dimanche dès 18 h, mais c'est une feuille fixe, sans animation. Cette maquette en fait une **story** à la façon d'Instagram :
- environ 16 écrans, plein écran sur le téléphone ;
- on touche à droite pour avancer, à gauche pour revenir, et un appui long met en pause ;
- **Mimi présente chaque rubrique** dans son rôle : hôte, banquier, coach, chef, majordome, véto, critique, DJ, paparazzi, juge, et ciré jaune s'il pleut.

Le déroulé :
1. **Ouverture**.
2. **La note de la semaine** sur 20 : un compteur qui défile, puis le verdict en coup de tampon.
3. **Le bilan**, dans un ordre tiré au sort chaque semaine : Argent, Sport, Cuisine, Maison, Soins de Mimi, Cinéma, DJ Mimi, Photos, Tribunal des bêtises.
4. **La transition** : « Et maintenant… ».
5. **La semaine qui arrive** : agenda, anniversaires, météo.
6. **Le mot de Mimi**, avec les boutons « Revoir » et « Fermer ».

### Cinq modèles, cinq façons de bouger

| Modèle | Style | Animations |
|---|---|---|
| 🐾 Pattes de chat | Les couleurs du thème de l'appli, les ombres « pâte à modeler » | Les cartes rebondissent en s'écrasant, des traces de pattes traversent l'écran |
| 📰 Carnet papier | Un vrai journal sur papier | Les pages tournent en 3D, les mots sont tapés à la machine, le verdict tombe en coup de tampon et la page tremble |
| 🕹️ Rétro pixel | 16 bits, comme les jeux de la borne | Police en pixels faite maison, Mimi et les emojis en sprites, scores qui défilent par paliers, transition en blocs |
| 🌙 Les toits de Paris | La nuit sur les toits | Trois plans de toits en parallaxe, dessinés au hasard. Mimi saute d'un toit à l'autre, les étoiles filantes passent, les jours de l'agenda s'allument comme des étoiles |
| 📸 L'album | Polaroïds sur un tableau en liège | Le polaroïd est balayé et le suivant tombe d'en haut. Les photos sont distribuées une par une, la bulle est un post-it et Mimi un autocollant |

**Pour ne pas se lasser** :
- **le modèle change chaque semaine**, d'après le numéro de la semaine ;
- dans un même modèle, des variantes **tirées au sort** : couleurs, ciel, ruban, phrases de Mimi, ordre des rubriques, note simulée.
- Le tirage est **reproductible** : la même semaine donne toujours le même rappel.

## 🎯 Ce qu'on veut vérifier

- Est-ce qu'on a envie de l'ouvrir le dimanche soir, et de le regarder jusqu'au bout ?
- Quels modèles plaisent, et lesquels lassent ?
- Le rythme est-il bon (environ 6 s par écran), ou trop rapide, ou trop lent ?
- Mimi en narrateur : drôle, ou de trop ?

## ▶️ Comment l'essayer

- En ligne : https://samagie.github.io/Bidouille-en-ligne/experiences/002-rappel-de-la-semaine/
- Sur ordinateur, le panneau de droite permet de :
  - **choisir le modèle** ;
  - **simuler une autre semaine** ;
  - couper « **qui a fait quoi** » ;
  - activer « **moins d'animations** ».
- Raccourcis dans l'adresse : `?modele=pixel`, `?semaine=47`, `?qui=0`, `?reduit=1`, `?vitesse=0.5` (2 fois plus rapide).
- En local : `python3 -m http.server` à la racine du dépôt, puis http://localhost:8000/experiences/002-rappel-de-la-semaine/

## 🔌 Pour l'intégrer à Chez Miaouss plus tard

### Le format des données

C'est celui de `semaine-exemple.json`, où **toutes les données sont inventées**. Il reprend ce que `weekly.ts` calcule déjà :

| Clé | Contenu |
|---|---|
| `foyer` | `personnes` (id, prénom) et le nom du chat |
| `semaine` | `numero`, `debut`, `fin` (dates ISO) |
| `note` | `valeur`, `sur`, `verdict` |
| `bilan.argent` | `depense`, `categories[]`, `equilibre` (qui doit quoi à qui), `budgetUtilise` |
| `bilan.sport` | `seances`, `objectif`, `parPersonne` |
| `bilan.cuisine` | `cuisines`, `planifies`, `star`, `stocksBas[]` |
| `bilan.maison` | `faites`, `enRetard`, `parPersonne`, `phare` |
| `bilan.soins` | `repas`, `brossages`, `jeux`, `serie`, `parPersonne` |
| `bilan.cinema` | `films[]` (titre, note sur 5), `series[]` |
| `bilan.dj` | `morceaux`, `top`, `parPersonne` |
| `bilan.photos` | `nombre`, `legendes[]` (dans l'appli : les vraies photos de la galerie) |
| `bilan.tribunal` | `betises[]`, `peine` |
| `aVenir` | `agenda[]`, `anniversaires[]`, `meteo[]` (Open-Meteo) |
| `motDeMimi` | le petit mot de la fin |

Une rubrique absente est simplement sautée.

### Les règles de l'appli, déjà respectées

- **Qui a fait quoi** : `quiFaitQuoi: false` retire tous les prénoms et n'affiche que des totaux. On le branchera sur `prefs.stats` et `showWho()`. C'est vérifié par un test.
- **Données privées** : aucun module privé n'est lu (budgets perso, cadeaux, santé…). L'argent ne montre que les dépenses communes.
- **Aucun défilement horizontal**, vérifié à 360 px sur les 16 écrans des 5 modèles.
- **Classes CSS préfixées** `rs-`, et `pa-`, `ca-`, `px-`, `to-`, `al-` dans les modèles.
- **Moins d'animations** : si le téléphone le demande (`prefers-reduced-motion`), on passe à de simples fondus, les chiffres s'affichent directement et rien ne tourne en boucle.

### Le poids, mesuré

L'appli est presque pleine (environ 410 Ko sur 420). Le rappel se **charge à part, seulement quand on l'ouvre**, et **un seul modèle** est téléchargé :

| Fichier | Compressé (gzip) |
|---|---|
| Moteur + styles + Mimi | 16,2 Ko |
| Pattes de chat | 3,2 Ko |
| Carnet papier | 3,8 Ko |
| Rétro pixel | 5,5 Ko |
| Les toits de Paris | 4,5 Ko |
| L'album | 3,4 Ko |

Le rappel ne charge aucune bibliothèque, aucune image et aucune police (la police pixel est dessinée en code). Une fois minifiés, ces fichiers seront encore plus légers.

### Mimi

Dans la maquette, il est dessiné en SVG (`mimi.js`) : il cligne des yeux, bouge la queue et l'oreille, et porte l'accessoire de son rôle. Ses couleurs se règlent dans `COULEURS`. Dans l'appli, on pourra garder ce dessin ou brancher `avatar(humeur, rôle)` avec tes propres images.

## 📝 Ce qu'on a appris

- Les animations restent fluides sans aucune bibliothèque : tout passe par la Web Animations API et du CSS.
- Une bulle animée avec `clip-path` rogne son propre cadre : il faut élargir la zone de découpe.
- La frappe à la machine lettre par lettre coupe les textes de plusieurs lignes en colonne. Il faut taper **mot à mot**.
- (à compléter après les premiers dimanches)

## ➡️ Prochaine étape

- Le regarder sur le téléphone, à deux, et noter les modèles préférés.
- Si ça plaît, le porter dans Chez Miaouss :
  1. brancher les données de `weekly.ts` sur ce format ;
  2. ajouter le bouton « Regarder en story » sur le journal de la semaine ;
  3. charger le rappel à part.
