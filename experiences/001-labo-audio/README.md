---
titre: Le dictaphone de Madeleine
statut: en cours
date: 2026-11-01
resume: Quatre cassettes abîmées à remettre en état (à l'envers, trop vite, couvertes par une autre voix) pour trouver le code d'un coffre.
tags: web, son, énigme, IRL
---

# 🎧 Labo audio : le dictaphone de Madeleine

<!--
  L'en-tête ci-dessus (entre les ---) alimente la vitrine et le sommaire.
  statut : en cours | prometteur | en pause | abandonné | promu
  tags   : mots séparés par des virgules (ex. web, ia, jeu)
-->

## 💡 L'idée

Madeleine, une enquêtrice du paranormal, a disparu. Elle a laissé un dictaphone, quatre cassettes et un coffre à quatre chiffres. Chaque cassette cache un chiffre, abîmé d'une façon différente :

| Cassette | Ce qui ne va pas | Ce qu'il faut faire |
|---|---|---|
| 1 · Cave | Elle parle à l'envers. | Interrupteur « À l'envers » |
| 2 · Grenier | Enregistrée 3 fois trop vite. | Vitesse vers ×0,33 |
| 3 · Chambre d'enfant | Une voix grave (« l'entité ») parle par-dessus et donne un **faux** chiffre. | Filtre vers « Aigus » |
| 4 · La dernière | Les trois à la fois, avec la vitesse à ×0,5. | Les trois réglages |

On peut aussi glisser le doigt sur l'écran pour réécouter un passage en boucle. Les « notes de Madeleine » donnent jusqu'à trois coups de pouce par cassette. Un code qui contient un chiffre de l'entité déclenche un message spécial au coffre.

C'est le banc d'essai de l'outil **`audio_lab`**, le chantier n°3 de la feuille de route « phygital » d'IRL (`docs/08-feuille-de-route-phygital.md`).

## 🎯 Ce qu'on veut vérifier

- L'énigme est-elle **amusante**, et pas seulement technique ?
- Les trois réglages (sens, vitesse, filtre) sont-ils **compréhensibles sans explication** sur un téléphone ?
- La difficulté monte-t-elle bien ? Le piège de l'entité (cassette 3) surprend-il ?
- Combien de temps faut-il, combien de notes et d'essais ? Le bilan de fin les affiche.

## ▶️ Comment l'essayer

- En ligne : https://samagie.github.io/Bidouille-en-ligne/experiences/001-labo-audio/ (avec un casque, de préférence).
- En local : lancer `python3 -m http.server` à la racine du dépôt, puis ouvrir http://localhost:8000/experiences/001-labo-audio/. En ouvrant directement le fichier, les cassettes ne se chargent pas.
- Solution : le code est 7429.

### Comment c'est fait

- Une seule page (`index.html`), sans dépendance. Le son passe par la Web Audio API :
  - lecture à l'envers : une copie inversée du son ;
  - vitesse : comme une bande, plus lent veut aussi dire plus grave ;
  - filtre : 4 filtres en cascade, coupe-haut ou coupe-bas ;
  - **volume automatique**, qui remonte un son devenu faible après filtrage, puis un limiteur.
- Les cassettes (`sons/*.wav`) sont fabriquées par `fabrication/fabriquer_sons.py`, qui demande d'installer Piper, numpy et scipy (le mode d'emploi est en tête du script).
  - La voix est **Piper « siwis »**, en français, entraînée sur le jeu de données SIWIS sous licence **CC-BY 4.0**.
  - L'entité est la même voix, ralentie, plus grave, et privée de ses aigus. Madeleine ne garde que ses aigus : c'est ce qui permet au filtre de séparer les deux voix.
  - Les fichiers sont en WAV et non en MP3, parce que la compression MP3 efface justement ce que l'oreille n'entend pas, donc la voix cachée.

### Vérifications faites

Chaque cassette a été jouée dans Chromium, avec les commandes de la page, puis le son sorti a été transcrit par Whisper (reconnaissance vocale) :

| Réglage | Ce que Whisper entend |
|---|---|
| Cassette 1 à l'envers | « premier chiffre, 7, je répète 7 » |
| Cassette 2 à ×0,33 | « le deuxième chiffre est 4 » |
| Cassette 3, filtre Aigus | « le troisième chiffre est deux, deux » |
| Cassette 4 à l'envers, ×0,5, Aigus | « Dernier chiffre. Neuf. Ouvre le coffre… » |
| Cassettes 3 et 4 sans réglage | rien de compréhensible |

Les réglages n'ont pas besoin d'être précis. Le filtre marche entre 1 200 et 3 200 Hz sur la cassette 3, et entre 1 800 et 2 800 Hz sur la 4, avec une vitesse entre ×0,45 et ×0,55.

## 📝 Ce qu'on a appris

- Pendant la fabrication : un bruit grave, même très fort, **ne cache pas** une voix aiguë. Il faut une **autre voix**, beaucoup plus forte, pour couvrir Madeleine. Ça a donné l'idée du faux chiffre de l'entité.
- À vérifier à l'oreille : avec le filtre « Graves », comprend-on bien le faux « cinq » de l'entité ? Whisper n'y arrive pas, mais il comprend mal les voix étouffées.
- (à compléter après les premières parties)

## ➡️ Prochaine étape

- Faire jouer deux ou trois personnes et noter le temps, les notes lues et les endroits où elles bloquent.
- Si c'est amusant, porter l'outil dans IRL (outil `audio_lab`, Flutter) et en faire une étape d'un scénario (Chasse aux fantômes, Manoir Blackwood).
