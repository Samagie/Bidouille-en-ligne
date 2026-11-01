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
- **⚙️ Paramètres** : c'est l'aperçu de la section qui ira dans l'onglet Paramètres de l'appli (détails plus bas). On peut y **désactiver le rappel**, et les réglages restent mémorisés sur l'appareil.
- **🧪 Outils de la maquette** : simuler une autre semaine, essayer un modèle, recommencer.
- Sur téléphone, ces deux panneaux sont sous la story : fais défiler la page vers le bas.
- Raccourcis dans l'adresse (pour les tests, rien n'est mémorisé) :
  - `?modele=pixel` : essayer un modèle ;
  - `?semaine=47` : simuler une autre semaine ;
  - `?qui=0` : masquer qui a fait quoi ;
  - `?reduit=1` : moins d'animations ;
  - `?actif=0` : rappel désactivé ;
  - `?vitesse=0.5` : défilement 2 fois plus rapide.
- En local : `python3 -m http.server` à la racine du dépôt, puis http://localhost:8000/experiences/002-rappel-de-la-semaine/

## ⚙️ Le réglage dans l'onglet Paramètres

Le rappel est **désactivable**. Voici la section « Rappel de la semaine » de l'onglet Paramètres, telle qu'elle fonctionne dans la maquette :

| Réglage | Choix | Par défaut |
|---|---|---|
| **Rappel de la semaine en story** | activé / désactivé | activé |
| Quand le proposer | dimanche dès 18 h · lundi matin | dimanche 18 h |
| Modèle | change chaque semaine · toujours le même | change chaque semaine |
| Mes modèles | on retire de la rotation ceux qu'on n'aime pas (au moins un reste coché) | les 5 |
| Rythme | calme (×1,3) · normal · rapide (×0,7) | normal |
| Rubriques affichées | Argent, Sport, Cuisine, Maison, Soins, Cinéma, DJ, Photos, Tribunal | toutes |
| Afficher qui a fait quoi | oui / non (`prefs.stats` / `showWho()`) | oui |
| Moins d'animations | oui / non, et suit aussi le réglage du téléphone | non |

**Désactivé = rien ne change par rapport à aujourd'hui** : le journal de la semaine reste disponible dans sa version classique. Une petite mention rappelle que la story est désactivée dans Paramètres.

## 🔌 Pour l'intégrer à Chez Miaouss

### Le message à coller dans une session sur ton PC

Ouvre une session Claude Code sur ton PC, dans le dossier de Chez Miaouss, et colle ceci :

```
Nouveau chantier : intégrer le « rappel de la semaine en story » dans Chez Miaouss.
La maquette est publique : https://github.com/Samagie/Bidouille-en-ligne/tree/main/experiences/002-rappel-de-la-semaine
(démo : https://samagie.github.io/Bidouille-en-ligne/experiences/002-rappel-de-la-semaine/). Lis sa fiche README.md en entier.

1. Reprends le moteur (rappel.js, rappel.css, mimi.js) et les 5 modèles (modeles/) dans l'appli, et branche-les sur les données que calcule déjà src/ui/home/weekly.ts, au format de semaine-exemple.json.
2. Sur le journal de la semaine, ajoute un bouton « Regarder en story ». Le dimanche dès 18 h (ou le lundi matin, selon le réglage), le rappel s'ouvre directement en story s'il n'a pas encore été vu.
3. Onglet Paramètres : ajoute la section « Rappel de la semaine », avec les réglages du tableau de la fiche (interrupteur principal, quand, modèle, mes modèles, rythme, rubriques, qui a fait quoi, moins d'animations), enregistrés dans les préférences de l'appli. Désactivé = le journal classique exactement comme aujourd'hui.
4. Poids : la story et chaque modèle se chargent à part, seulement à l'ouverture. Aucun octet de plus dans le paquet principal (budget de 420 Ko presque plein).
5. Respecte le CLAUDE.md de l'appli : prefs.stats / showWho() pour « qui a fait quoi », jamais de module privé, rien qui dépasse à 360 px, classes CSS préfixées, tests, façon de livrer. Mimi : garde le dessin SVG ou branche avatar(humeur, rôle).
6. Montre-moi le résultat sur le téléphone, rappel activé puis désactivé.
```

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
| Moteur + styles + Mimi | 17,4 Ko (dont les styles de la page de maquette, qui ne partiront pas dans l'appli) |
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
- Si ça plaît, l'intégrer dans Chez Miaouss avec le message ci-dessus.

### Pistes d'amélioration

1. 📈 **Comparé à la semaine dernière** : de petites flèches ↑↓ sur chaque chiffre (« sport +2 », « dépenses −15 % »), et Mimi qui le commente.
2. 🎯 **Les défis de Mimi** : à la fin, Mimi propose 1 ou 2 défis pour la semaine suivante. Le dimanche d'après, il annonce « Défi réussi ! » ou « Raté… ».
3. 🎵 **Un son par modèle**, désactivable : bips 8 bits, machine à écrire, piano doux, déclic d'appareil photo. Ils sont générés dans le navigateur, donc sans fichier ni poids.
4. 💌 **Partager la carte de la semaine** : l'écran de la note devient une image à envoyer à l'autre.
5. ❤️ **Réagir à un écran** (❤️ 😂 😾), et voir les réactions de l'autre.
6. 🎄 **Des modèles de saison** : Noël, Halloween, l'été, l'anniversaire de Mimi, avec son costume de saison.
7. 🔊 **« Mimi lit le journal »** : la voix du téléphone lit la story.
8. 📺 **Version Nest Hub** : un diaporama horizontal qui défile tout seul.
9. 🗓️ **La même story pour le mois et l'année** : le « Wrapped » de l'appli pourrait réutiliser ce moteur.

Mon conseil : commencer par les pistes 1 et 2, qui rendent le rappel *utile* et pas seulement joli. Ensuite la piste 3, qui coûte peu et fait beaucoup d'effet.
