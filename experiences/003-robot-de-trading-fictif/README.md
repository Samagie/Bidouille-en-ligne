---
titre: Robot de trading fictif
statut: en cours
date: 2026-11-08
resume: Un robot achète et revend des cryptos tout seul, avec 10 000 € imaginaires, sur les vrais cours en direct, et une grande course compare 4 robots sur 12 actifs pendant 24 h.
tags: web, trading, crypto, temps réel, simulation
---

# 🤖 Robot de trading fictif

<!--
  L'en-tête ci-dessus (entre les ---) alimente la vitrine et le sommaire.
  statut : en cours | prometteur | en pause | abandonné | promu
  tags   : mots séparés par des virgules (ex. web, ia, jeu)
-->

## 💡 L'idée

Une appli de trading **automatique** mais **fictive** : on part avec 10 000 € imaginaires, et un robot achète et revend tout seul une cryptomonnaie en suivant les **vrais cours en direct**. Rien n'est acheté pour de vrai.

- 6 cryptos au choix (Bitcoin, Ethereum, Solana, XRP, Dogecoin, Cardano), cotées en euros.
- 4 méthodes de robot, expliquées simplement :
  - 📈 **Suivre la tendance** : croisement d'une moyenne rapide (9 bougies) et d'une lente (21) ;
  - 🔄 **Acheter les creux** : une jauge de 0 à 100 (le RSI) ; achat sous 30, revente au-dessus de 70 ;
  - 🚀 **Sauter sur les records** : achat quand le prix bat le record des 20 dernières bougies, revente sous le plus bas des 10 dernières ;
  - 🎲 **Au hasard** : le témoin. Un robot qui ne fait pas mieux que lui n'est pas plus malin que la chance.
- Une bougie de 1, 5 ou 15 minutes, un **filet de sécurité** réglable (revente automatique à −1, −2 ou −5 %), et des **frais de 0,1 %** à chaque opération, comme chez un vrai courtier.
- Le portefeuille est comparé en permanence à « j'achète au départ et je n'y touche plus ».
- **La course des robots** rejoue les 4 méthodes sur les dernières 24 h, pour voir laquelle aurait gagné.
- **La grande course** fait pareil sur **12 actifs à la fois** : 10 cryptos, l'or (jeton PAXG) et l'euro face au dollar. Elle affiche un tableau avec le gagnant de chaque ligne, la moyenne, le nombre de victoires et un verdict. Elle utilise les cours en dollars, bien plus échangés que les cours en euros. Toucher une crypto lance le robot en direct dessus.
- Le portefeuille est gardé dans le navigateur. Quand on revient, le robot **rattrape** ce qu'il aurait fait pendant l'absence.

Les cours viennent de Binance (en direct), avec Coinbase en secours. Aucune clé, aucun serveur : tout tourne dans la page.

## 🎯 Ce qu'on veut vérifier

- Est-ce amusant de regarder un robot trader en direct ?
- Un robot à règles simples fait-il mieux que le hasard, ou que « acheter et attendre », une fois les frais payés ?

## ▶️ Comment l'essayer

- En ligne : https://samagie.github.io/Bidouille-en-ligne/experiences/003-robot-de-trading-fictif/
- En local : ouvrir `index.html` dans un navigateur (une connexion internet est nécessaire pour les cours).
- La page doit rester ouverte pour que le robot travaille. Au retour, il rattrape jusqu'à 1 000 bougies (environ 16 h en bougies de 1 minute, 10 jours en bougies de 15 minutes).

## 📝 Ce qu'on a appris

- Les cours crypto en direct sont gratuits et accessibles sans clé depuis une simple page web (Binance `data-api.binance.vision` et `data-stream.binance.vision`, Coinbase en secours).
- Premier essai sur 16 h de Bitcoin (8 novembre 2026, marché en légère baisse) : **les 4 robots ont fait moins bien que « acheter et attendre »**. Avec 34 à 52 opérations chacun, les frais (0,1 % à chaque fois, soit 3 à 5 % au total) expliquent une bonne partie de l'écart. Le robot « tendance » est même arrivé derrière le hasard.

- Grande course du 9 novembre 2026 (24 h, bougies de 1 minute, filet à −2 %) : **« acheter et attendre » arrive premier sur 9 actifs sur 12**, et le robot « records » sur les 3 autres. En moyenne : attendre −1,31 %, records −3,74 %, hasard −4,23 %, creux −4,61 %, tendance −6,38 %. Le hasard fait donc mieux que 2 des 3 robots « malins ».
- Sur l'euro face au dollar, qui bouge très peu, les frais à 0,1 % écrasent tout : jusqu'à −8 % pour le robot tendance.
- Les chiffres ont été vérifiés : ils correspondent aux variations sur 24 h publiées par Binance.
- Les actions de la Bourse ne sont pas accessibles gratuitement sans clé depuis une page web : à garder pour plus tard.

## ➡️ Prochaine étape

- Relancer la grande course plusieurs jours de suite (et en bougies de 5 ou 15 minutes, avec moins d'opérations, donc moins de frais) pour voir si le classement change.
- Idées possibles : les 4 robots en concurrence en direct, des réglages des méthodes (nombre de bougies, seuils), les actions de la Bourse (il faudrait une clé d'API).
