---
titre: Sites pour commerçants
statut: en cours
date: 2026-11-08
resume: Deux sites de démonstration pour des commerces imaginaires (une boulangerie, un barbier), pour voir ce qu'on pourrait vendre aux commerçants du quartier.
tags: web, commerce, revenus
---

# Sites pour commerçants

<!--
  L'en-tête ci-dessus (entre les ---) alimente la vitrine et le sommaire.
  statut : en cours | prometteur | en pause | abandonné | promu
  tags   : mots séparés par des virgules (ex. web, ia, jeu)
-->

## 💡 L'idée

Faire des sites d'une page pour les commerçants du coin, comme complément de revenus. Avant d'en parler à un vrai commerçant, on fabrique deux exemples très différents pour montrer ce que ça donne :

- **Le Fournil des Tilleuls**, une boulangerie : enseigne façon devanture, heure de la prochaine fournée en direct, carte avec les prix, commande pour le lendemain par SMS ;
- **Marius, barbier** : enseigne rayée qui tourne, prestations et prix, réservation d'un créneau en quatre étapes, équipe, avis.

Les deux sites ont en commun : ouvert ou fermé calculé en direct, horaires du jour mis en avant, plan d'accès, boutons « Appeler » et « Commander » ou « Réserver » toujours visibles sur téléphone.

## 🎯 Ce qu'on veut vérifier

- Est-ce que ça fait « vrai site pro » au point qu'un commerçant pourrait le payer ?
- Combien de temps faut-il pour en faire un ? (Ici : une session avec Claude par site.)
- Quel prix annoncer ? Piste : 300 à 600 € le site, plus éventuellement un petit forfait pour les mises à jour.

## ▶️ Comment l'essayer

- En ligne : https://samagie.github.io/Bidouille-en-ligne/experiences/003-sites-pour-commercants/
- En local : ouvrir `index.html` dans un navigateur.
- Astuce pour les démonstrations : ajouter `?heure=2026-11-10T16:05` à l'adresse d'un site pour simuler une heure précise (ouvert, fermé, juste avant une fournée…).

## 🧰 Comment c'est fait

- Chaque site est un seul fichier `index.html`, sans outil à installer, avec ses photos dans un dossier `photos/`.
- Polices Google Fonts (Bodoni Moda et Instrument Sans pour la boulangerie, Bricolage Grotesque pour le barbier).
- Photos : Unsplash (libres d'utilisation). Pour un vrai client, on prendrait ses propres photos.
- Numéros de téléphone : tranches réservées aux fictions (02 61 91… et 04 65 71…), ils n'appartiennent à personne.
- La commande et la réservation sont simulées : rien n'est envoyé ni enregistré. Les créneaux pris du barbier sont inventés, mais toujours les mêmes d'une visite à l'autre.

## 📝 Ce qu'on a appris

- Un site de commerce sans serveur peut déjà rendre de vrais services : calculer si c'est ouvert, préparer un SMS de commande, afficher le prochain créneau.
- Ce qui rend un site mémorable, c'est un détail propre au métier : l'heure de la fournée pour le boulanger, l'enseigne qui tourne pour le barbier.
- Pour une vraie réservation, il faudra soit un SMS au commerçant, soit un branchement sur son agenda (Planity, Google Agenda…).

## ➡️ Prochaine étape

- Montrer les deux démos à un ou deux commerçants et noter leurs réactions.
- Si ça plaît : préparer une page « offre » (ce qui est inclus, prix, délai) et un troisième modèle (restaurant ou fleuriste ?).
