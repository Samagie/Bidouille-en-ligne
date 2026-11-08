---
titre: Chasseur de bonnes affaires
statut: en cours
date: 2026-11-08
resume: Trouver sur Leboncoin, Vinted et eBay les appareils en panne faciles à réparer, et savoir en un coup d'œil si une annonce est une affaire.
tags: web, bonnes affaires, réparation, leboncoin, vinted
---

# 🔧 Le chasseur de bonnes affaires

<!--
  L'en-tête ci-dessus (entre les ---) alimente la vitrine et le sommaire.
  statut : en cours | prometteur | en pause | abandonné | promu
  tags   : mots séparés par des virgules (ex. web, ia, jeu)
-->

## 💡 L'idée

Sur Leboncoin et Vinted, des appareils sont vendus « pour pièces » ou « HS » pour une panne qui se répare en 15 minutes avec un tournevis : une Switch dont les manettes dérivent, un Dyson dont la batterie est usée, un PC vendu sans chargeur, une platine vinyle dont la courroie est détendue…

L'outil aide à **les trouver**, puis à **trier les bonnes affaires des pièges**. Il a quatre onglets :

| Onglet | Ce qu'il fait |
|---|---|
| 🔎 **Chercher** | On choisit un appareil (ou on tape le sien) et un prix max. L'outil prépare les recherches qui marchent (« switch hs », « joycon drift », « pc portable sans chargeur »…), triées des plus récentes aux plus anciennes, avec un bouton par site : **Leboncoin**, **Vinted** et **eBay** (sur eBay, avec son filtre officiel « pour pièces »). |
| 🧐 **Analyser** | On colle le texte d'une annonce. L'outil reconnaît l'appareil et le modèle, repère la panne, dit si elle est facile, et calcule : *valeur en état de marche − prix − pièces = ce qu'on économise*. Il donne un verdict (🎯 Bonne affaire, 🤔 Un pari, 🧯 Risqué, ✋ À fuir, 💸 Trop cher), le prix à proposer et un **message tout prêt pour le vendeur**, avec les bonnes questions. |
| 🛠️ **Pannes** | Le guide : pour chaque appareil, les pannes de la plus facile à la plus risquée, le prix de la pièce, un lien vers un tuto vidéo et vers la pièce. Plus les pièges valables pour tous les appareils. |
| 📒 **Trouvailles** | Les annonces qu'on a gardées, avec leur verdict. Elles restent sur l'appareil. |

**Les 9 familles d'appareils** : Nintendo Switch · PlayStation et Xbox · iPhone · Android · PC portable et Mac · casques · platines vinyle et hi-fi vintage · aspirateurs sans fil · trottinettes électriques. Pour tout le reste, il y a « ✏️ Autre chose ».

### Les pièges qu'il repère

- **Bloqué iCloud ou compte Google** : irréparable, et souvent volé.
- **Code oublié sur un téléphone** : effacer le code fait réclamer le compte de l'ancien propriétaire.
- **Mot de passe BIOS** sur un PC, **console bannie**, **téléphone sur liste noire**.
- **Tombé dans l'eau**, **carte mère** : réparation de spécialiste.

Il évite aussi les fausses alertes : « jamais tombé dans l'eau », « iCloud déconnecté », « clavier AZERTY », « batterie neuve » ou « paiement en liquide » ne sont pas des pannes.

### Pourquoi pas un robot qui récupère les annonces tout seul ?

- **Leboncoin bloque les robots** : la page renvoie une erreur dès qu'un programme la demande.
- Les conditions d'utilisation de Leboncoin et de Vinted **interdisent la récupération automatique** des annonces, et Leboncoin a déjà gagné un procès contre un site qui le faisait.
- **Les sites le font déjà très bien, et gratuitement** : une recherche sauvegardée envoie une notification à chaque nouvelle annonce. L'outil fabrique les bonnes recherches, et les alertes des sites font le guet.

## 🎯 Ce qu'on veut vérifier

- Les recherches toutes prêtes font-elles remonter de vraies bonnes affaires ?
- Le verdict est-il juste sur de vraies annonces ? Quelles pannes ou quels pièges manquent ?
- Les prix estimés (valeur en état de marche, pièces) sont-ils réalistes ?
- Est-ce qu'on s'en sert vraiment avant d'acheter ?

## ▶️ Comment l'essayer

- En ligne : https://samagie.github.io/Bidouille-en-ligne/experiences/003-chasseur-de-bonnes-affaires/
- Dans « 🧐 Analyser », les boutons d'exemple chargent 5 annonces inventées.
- Raccourcis dans l'adresse :
  - `?exemple=0` à `?exemple=4` : ouvrir un exemple d'annonce ;
  - `?onglet=guide` : ouvrir un onglet (`chercher`, `analyser`, `guide`, `trouvailles`) ;
  - `?appareil=pc` : choisir un appareil dans « Chercher ».
- En local : ouvrir `index.html` dans un navigateur.

### Les fichiers

| Fichier | Contenu |
|---|---|
| `appareils.js` | **Le savoir du chasseur**, facile à compléter : pour chaque appareil, ses modèles et leur valeur, les recherches, les pannes (mots repérés, difficulté, prix de la pièce, conseil, questions au vendeur). |
| `chasseur.js` | Le moteur : lecture de l'annonce, verdict, calcul, liens, trouvailles. |
| `chasseur.css`, `index.html` | La page. |

## 📝 Ce qu'on a appris

- Chercher un mot de pièce seul (« batterie », « clavier », « HDMI ») donne plein de fausses pannes : il faut chercher des **façons de décrire une panne** (« batterie HS », « clavier ne marche plus »).
- Il faut aussi lire les négations : « jamais tombé dans l'eau », « pas volé », « iCloud déconnecté ».
- Les liens de recherche de Vinted acceptent bien le prix max et le tri « plus récentes ». Le format des liens Leboncoin est le plus courant, mais pas officiel : à confirmer sur le téléphone.
- (à compléter avec de vraies annonces)

## ➡️ Prochaine étape

- L'essayer sur de vraies annonces, et noter les erreurs (panne ratée, fausse alerte, prix à côté).
- Créer 2 ou 3 alertes à partir des recherches, et voir ce qui tombe en une semaine.

### Pistes d'amélioration

1. 📲 **Partager vers l'outil** : depuis l'appli Leboncoin, « Partager » envoie l'annonce directement dans « Analyser » (il faut transformer la page en petite appli installable).
2. 📸 **Lire une capture d'écran** de l'annonce, par l'IA. Cela demande une clé d'API : en local, ou à voir ensemble.
3. 💶 **Les prix réels** : relever le prix des modèles qui marchent pour affiner les estimations, appareil par appareil.
4. ➕ **Plus d'appareils** : appareils photo, GoPro, Kindle, robots de cuisine, outils sans fil (perceuses dont la batterie est morte), vélos.
5. 🧾 **Le carnet de réparation** : pour chaque trouvaille achetée, le prix payé, les pièces, le temps passé et le prix de revente, pour voir ce qui rapporte vraiment.
6. 🤖 **Un guetteur sur le PC** (si les alertes des sites ne suffisent pas) : un petit programme qui surveille Vinted et prévient quand une annonce reçoit le verdict « 🎯 Bonne affaire ». À peser avant de le lancer : c'est contraire aux conditions de Vinted, et impossible sur Leboncoin.
