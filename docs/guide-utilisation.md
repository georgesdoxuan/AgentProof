# Guide d'utilisation d'AgentProof

> On envoie un client mystère IA sur votre site e-commerce. Il essaie d'acheter, et on vous montre où il bloque.

Ce guide explique comment utiliser AgentProof de A à Z : à quoi il sert, comment lancer un audit, comment lire le rapport et comment suivre son site dans le temps.

Adresse de l'application : https://agentproof-iota-tawny.vercel.app

---

## Sommaire

1. [À quoi sert AgentProof](#1-à-quoi-sert-agentproof)
2. [Pourquoi c'est utile pour une entreprise](#2-pourquoi-cest-utile-pour-une-entreprise)
3. [Les mots à connaître](#3-les-mots-à-connaître)
4. [Créer son compte](#4-créer-son-compte)
5. [Lancer un audit](#5-lancer-un-audit)
6. [Pendant l'audit](#6-pendant-laudit)
7. [Lire le rapport](#7-lire-le-rapport)
8. [Corriger, puis prouver la correction](#8-corriger-puis-prouver-la-correction)
9. [Ranger ses rapports : favoris, renommage, corbeille](#9-ranger-ses-rapports--favoris-renommage-corbeille)
10. [Suivre son site : automations, Slack, suivi mensuel](#10-suivre-son-site--automations-slack-suivi-mensuel)
11. [Le test de paiement (facultatif)](#11-le-test-de-paiement-facultatif)
12. [Travailler en équipe](#12-travailler-en-équipe)
13. [Crédits et tarifs](#13-crédits-et-tarifs)
14. [Le classement public](#14-le-classement-public)
15. [Règles de l'agent, données et légalité](#15-règles-de-lagent-données-et-légalité)
16. [Questions fréquentes](#16-questions-fréquentes)

---

## 1. À quoi sert AgentProof

Demain, une partie des achats en ligne sera faite par des agents IA : « Trouve-moi un pull noir en taille M à moins de 60 € et commande-le. »

Sur beaucoup de sites, l'agent bloque : un bandeau cookies qui cache « Ajouter au panier », une pop-up, un sélecteur de taille qu'il ne sait pas cliquer, un captcha. Il abandonne et achète ailleurs. Le marchand, lui, ne le voit jamais.

AgentProof envoie un vrai agent IA sur votre site. Cet agent regarde l'écran et clique comme un client. Il joue des missions d'achat réalistes jusqu'à la première page du checkout. Vous obtenez :

- **un score** : la part des missions que l'agent mène jusqu'au checkout ;
- **des preuves** : la capture du moment exact où l'agent abandonne, et un replay étape par étape ;
- **une comparaison** avec un concurrent, sur les mêmes missions ;
- **un plan de corrections** classé par impact, prêt à transmettre à vos développeurs.

L'agent ne paie jamais, ne crée pas de compte et ne saisit aucune donnée personnelle pendant un audit.

## 2. Pourquoi c'est utile pour une entreprise

**Vous voyez ce que vous ne voyez pas aujourd'hui.** Un client humain qui bloque vous écrit parfois. Un agent IA qui bloque part sans laisser de trace. AgentProof rend ces ventes perdues visibles.

**Un test réel, pas une lecture du code.** D'autres outils lisent le code de votre site et concluent « en théorie, un agent devrait pouvoir acheter ». AgentProof envoie un agent qui essaie vraiment. Un script ne voit pas qu'un bandeau masque le bouton d'achat ; un agent qui regarde l'écran tombe dans le piège, comme le ferait l'agent d'un vrai client.

**Des preuves faciles à partager.** Chaque blocage est accompagné d'une capture et d'un replay. Plus de débat sur « est-ce vraiment un problème ? » : on le voit.

**Une liste de corrections priorisée.** Les blocages les plus fréquents passent en premier, avec la correction proposée.

**Un suivi dans le temps.** Une mise à jour du site peut casser un parcours qui marchait. Les automations relisent vos pages et vous préviennent si quelque chose change ou si le score baisse.

**Pour qui ?**

| Profil | Ce qu'il en fait |
|---|---|
| Responsable e-commerce | Suit un score, récupère des preuves et une liste de corrections, vérifie qu'une correction a marché. |
| Agence e-commerce ou SEO | Revend l'audit à ses clients, sous sa propre marque, depuis un seul espace. |

AgentProof commence par la **mode** : les missions sont pensées pour des boutiques de vêtements, ce qui permet de comparer les sites entre eux.

## 3. Les mots à connaître

| Mot | Sens |
|---|---|
| **Mission** | Une consigne d'achat donnée à l'agent, par exemple « cherche un article, choisis la taille M, ajoute-le au panier et va jusqu'au checkout ». |
| **Audit** | Un ensemble de missions jouées sur un site (cinq par défaut). Il produit un rapport. |
| **Succès** | L'agent atteint la première page du checkout (page qui demande connexion, e-mail, adresse ou paiement) **et** un juge visuel le confirme sur la capture. Le panier seul ne compte pas. |
| **Blocage** | La raison de l'échec : bandeau cookies, pop-up, recherche ou filtre qui échoue, sélecteur de taille, bouton qui ne réagit pas, compte obligatoire, erreur de page, etc. |
| **Score** | Missions réussies ÷ missions comptées. |
| **Hors score** | Une mission sans lien avec l'interface du site : rupture de stock, anti-bot ou captcha, article absent du catalogue, erreur de l'agent, ou résultat que le juge n'a pas pu vérifier. Elle est affichée à part et ne compte ni pour ni contre le site. |
| **Crédit** | L'unité de consommation : une mission jouée sur un site = un crédit. |

## 4. Créer son compte

1. Cliquez sur **Connexion** en haut de la page, ou lancez directement un audit depuis l'accueil.
2. Entrez votre adresse e-mail. Vous recevez un **lien de connexion valable 15 minutes**. Il n'y a pas de mot de passe.
3. À la première connexion, un **espace d'équipe** est créé pour vous. Vous en êtes le propriétaire.

Votre espace se trouve sous **Mon espace**. La barre de gauche donne accès à Accueil, Sites, Rapports et Réglages ; le bouton en bas de la barre la replie en icônes. **Réglages** regroupe en onglets Équipe, Abonnement, Paiement, Comptes de test, Automations et Compte. Le **Classement** s’ouvre depuis la page Sites.

L'interface existe en **français et en anglais** : la langue se règle dans **Compte**. Les rapports d'audit restent en français pour l'instant.

## 5. Lancer un audit

Deux portes d'entrée :

- depuis l'accueil, le formulaire **« Teste ton site »** ;
- depuis votre espace, le bouton **« Lancer un audit »**, qui donne accès à toutes les options.

### Les champs de base

- **Adresse de votre site** (obligatoire).
- **Un concurrent** (facultatif) : l'agent joue les mêmes missions chez lui, sur ses pages publiques et sans payer. Les deux scores s'affichent côte à côte.
- **E-mail du rapport** (depuis l'accueil) : par défaut, votre adresse de connexion.

### Choisir l'appareil

| Option | Ce que fait l'agent |
|---|---|
| **Ordinateur** | Joue les missions sur un écran d'ordinateur. |
| **Mobile** | Joue les missions sur un écran de téléphone simulé (390 × 844). Ce n'est pas un vrai smartphone. |
| **Ordinateur + Mobile** | Joue les mêmes missions sur les deux, présentées côte à côte dans le rapport. Utilise deux fois plus de crédits. |

### Choisir les missions

Par défaut, l'agent joue cinq missions d'achat réalistes, par exemple :

- recherche d'un article puis choix d'une taille ;
- navigation par le menu puis filtre de taille ;
- filtre de prix (moins de 60 €) ;
- choix d'une autre couleur sur un produit ;
- achat d'un article en promotion.

Les missions restent neutres sur le type de produit : l'agent ne demande jamais un article que le site ne vend pas.

Depuis votre espace, vous pouvez aussi :

- **cocher ou décocher** les missions à jouer ;
- **modifier une mission**, pour cet audit seulement ou pour toute l'équipe, puis revenir à la version par défaut si besoin ;
- **ajouter vos propres missions** en langage courant. Des idées sont proposées : produit précis, code promo, guide des tailles, retours et échanges, retirer un article du panier, quantité, livraison, commande en invité, taille épuisée, prix cohérent entre la fiche et le panier.

Quelle que soit la consigne, l'agent s'arrête toujours à la première page du checkout.

### Options avancées

- **Comparer les deux agents** : les mêmes missions jouées par l'agent rapide et l'agent précis, avec réussite, durée et coût côte à côte. Double le coût de l'audit et se fait sans concurrent.
- **Type de test** : audit complet, ou paiement seulement (voir [le test de paiement](#11-le-test-de-paiement-facultatif)).

### Avant de valider

En lançant l'audit, vous confirmez gérer ce site ou être autorisé à le tester. La **durée estimée** et le **nombre de crédits** s'affichent avant le lancement, à côté des missions. La durée est calculée à partir des derniers audits et tient compte des audits déjà en file d'attente. Les crédits tiennent compte du concurrent, d'Ordinateur + Mobile et du test de paiement ; au survol, vous voyez le maximum si des missions ratées sont rejouées.

Si le site a déjà été audité il y a moins de 7 jours, AgentProof vous ouvre le rapport existant au lieu d'en relancer un.

## 6. Pendant l'audit

- Le rapport **s'ouvre tout de suite** et se remplit mission par mission. Vous pouvez le consulter pendant l'audit.
- Le bouton **« Suivre l'agent »** permet de regarder l'agent en direct.
- Avec un concurrent ou en Ordinateur + Mobile, comptez environ le double du temps.
- Chaque mission ratée est **rejouée une fois** avant la fin de l'audit, pour écarter un échec dû au hasard. C'est le second essai qui compte.
- Quand l'audit est terminé, **un e-mail part** avec le lien du rapport.
- Vous pouvez **annuler l'audit** depuis le rapport (lien « Annuler l'audit » sous la progression, propriétaire et admins). Les missions pas encore lancées sont retirées et leurs crédits rendus ; celles que l'agent joue déjà se terminent et restent dans le rapport.

## 7. Lire le rapport

Le rapport se lit de haut en bas.

### Le score

Le **score agent** est la part des missions menées jusqu'au checkout. Repères :

| Score | Lecture |
|---|---|
| 70 % et plus | Prêt pour les agents |
| 40 à 69 % | Fragile |
| Moins de 40 % | Bloquant |

Sous le score, le rapport affiche le nombre de missions (« 3/5 ») et ce que le score couvre. Si l'échantillon est court, il dit de combien de points un seul résultat déplace le score.

Quand des missions sont hors score (anti-bot, rupture de stock…), un **taux réel** s'affiche aussi : il compte ces missions comme des échecs, comme les vivrait l'agent d'un vrai client. Le score mesure votre interface ; le taux réel mesure ce qu'un agent obtient vraiment aujourd'hui.

Une mission qui n'a réussi qu'au **2ᵉ essai** est marquée « Réussie au 2ᵉ essai » : elle compte comme réussie, mais le résultat est instable.

Si vous avez ajouté un concurrent, son score s'affiche à côté (**Face au concurrent**). Si un audit précédent existe, vous voyez aussi l'évolution.

### À corriger en premier

Les blocages sont **classés par impact** : celui qui arrête le plus de missions passe en premier. Pour chacun : ce qui s'est passé, la capture et la correction proposée. Exemples de corrections : « le bouton Tout accepter doit rester visible sans défiler », « les tailles doivent être des boutons, pas des images ».

Le plan de corrections est rédigé par une IA open source (Hugging Face). Ce sont des **hypothèses à vérifier avant d'agir** ; les constats, eux, viennent des missions jouées.

### Missions en bref, puis le détail de chaque mission

Pour chaque mission :

- le **verdict** (réussie, bloquée, hors score) ;
- l'**étape la plus loin atteinte** et le **premier blocage** ;
- le **dernier écran vu par l'agent** (capture) ;
- le **compte rendu de l'agent**, et sa réponse originale ;
- le bouton **« Voir le replay »** : le parcours étape par étape, avec à chaque étape l'écran, l'action, l'endroit cliqué et le raisonnement de l'agent.

Un **juge visuel** relit la dernière capture sans connaître l'avis de l'agent. Si le juge n'est pas d'accord ou ne peut pas trancher, la mission est marquée « non vérifiée » et sort du score. Cela évite les faux succès.

### Accès par agent IA

Une lecture complémentaire de votre site, sans navigateur, comme le ferait un robot :

- ce que dit votre fichier **robots.txt** aux agents IA ;
- si le site refuse les requêtes automatiques simples ;
- si une protection anti-bot ou un captcha est détecté ;
- les **deux voies d'achat** : par l'écran (agents qui cliquent comme un client) et par protocole (agents qui achètent par API, par exemple avec UCP, ACP ou WebMCP).

Cette partie n'entre pas dans le score : le score, c'est l'achat réel par l'agent.

### Partager le rapport

- **Envoyez le lien** du rapport, ou **téléchargez-le en PDF**.
- **Exportez les missions en CSV ou en JSON** (liens à côté de « Télécharger en PDF ») pour un tableur ou vos propres outils : verdict, blocage, détail, étapes, durée, coût, capture et lien du replay de chaque mission.
- Les membres de votre équipe le retrouvent dans **Rapports**.
- Un **badge « Agent-ready »** avec le score peut être affiché sur votre site (code HTML fourni dans le rapport). Il indique le mois de l'audit et devient gris au bout de 90 jours : un score est un fait daté.

## 8. Corriger, puis prouver la correction

1. Transmettez le blocage à vos développeurs (capture, replay et correction proposée sont dans le rapport).
2. Une fois la correction en ligne, **marquez le blocage comme corrigé** dans le rapport.
3. Lancez la vérification :
   - **« Prouver la correction »** rejoue seulement les missions bloquées ;
   - ou relancez l'audit complet.
4. Si le blocage a disparu, il passe dans **Corrections prouvées**.

La page de chaque site, dans **Sites**, montre le dernier score, la courbe de score audit après audit (dès le 2ᵉ audit), les corrections à vérifier et les corrections prouvées.

## 9. Ranger ses rapports : favoris, renommage, corbeille

Tout se passe dans **Rapports**, qui a trois rubriques : **Tous**, **Favoris** et **Corbeille**. Vous pouvez filtrer l'historique entre les audits en cours et terminés, et **chercher** un rapport par nom de site ou de rapport.

- **Favoris** : cliquez sur l'étoile ★ d'un rapport pour le retrouver dans Favoris.
- **Renommer** : depuis le menu d'actions du rapport. Laissez le champ vide pour reprendre le nom du site.
- **Corbeille** : « Mettre à la corbeille » retire le rapport des sites et de l'accueil de l'espace. Depuis la corbeille, vous pouvez le **restaurer** ou le **supprimer définitivement** (missions, captures et replays sont alors effacés). Un audit en cours ne peut être supprimé qu'une fois terminé.
- **Un site entier** se met à la corbeille depuis **Sites**.

## 10. Suivre son site : automations, Slack, suivi mensuel

Un site change souvent : nouveau thème, nouveau bandeau cookies, nouveau widget de chat. Les **automations** surveillent ces changements.

### Suivre des pages

1. Ouvrez **Automations** et indiquez les pages à suivre, une adresse par ligne (accueil, fiche produit, panier…).
2. Choisissez la **fréquence** : toutes les heures, toutes les 6 h, une fois par jour (par défaut) ou une fois par semaine.
3. Choisissez ce qui se passe **quand une page change** :
   - **Prévenir** : vous recevez une alerte ;
   - **Prévenir et auditer** : vous recevez une alerte et un audit repart tout seul.

AgentProof relit ce qui compte pour un agent d'achat : bandeau cookies, captcha, boutons, formulaires, robots.txt. **Les prix et les produits ne comptent pas** : une nouvelle promo ne déclenche pas d'alerte. La première vérification enregistre la page de référence.

Les vérifications de pages sont **gratuites**. Seul un audit relancé utilise des crédits, au plus un par page et par jour.

### Vérifier après chaque mise en ligne

Automations vous donne une **adresse secrète** à appeler après un déploiement (Vercel, Shopify ou GitHub). Toutes les pages suivies sont alors vérifiées dans la minute.

### Recevoir les alertes

- **Par e-mail**, toujours. Chaque e-mail d'alerte contient un lien de désinscription en un clic.
- **Sur Slack** : cliquez sur « Brancher Slack », choisissez le canal, un message de test part aussitôt.
- **Ailleurs** (Discord, n8n, Make, Zapier) : collez une URL de webhook entrant.

### Suivi mensuel

Avec le suivi mensuel, un **audit complet repart tous les 30 jours**, et vous êtes alerté si le score baisse de plus de **5, 10 ou 20 points**, selon votre réglage. L'alerte, et le rapport, disent **pourquoi** : les missions qui passaient et bloquent maintenant, avec leur blocage, et les changements de page vus par les automations entre les deux audits.

Une même modification de page n'est signalée qu'**une fois par 24 h** : une page qui change puis revient ne vous envoie pas d'alertes en boucle.

L'accueil de votre espace résume le mois : audits terminés, vérifications de pages, changements détectés, mises en ligne vérifiées, corrections prouvées, et ce qu'il faut corriger en priorité.

## 11. Le test de paiement (facultatif)

Pendant un audit, l'agent s'arrête toujours avant de payer. Le **test de paiement** est un test à part, facultatif, pour savoir si un agent peut aller jusqu'au bout.

- L'agent part au plus près du checkout, prend le **premier article disponible** et **paie une seule fois** avec la carte de votre équipe, en 3 à 10 minutes.
- Il n'est **jamais** joué sur un concurrent.
- Un refus « fonds insuffisants » prouve que le paiement a bien atteint la banque.

**Attention :** avec une carte approvisionnée, la commande est réelle. Utilisez une carte virtuelle à 0 € pour ne rien acheter, et gardez votre téléphone à portée pour valider le 3D Secure.

Garde-fous :

- **Confirmation à chaque test** : une case « Je confirme un paiement réel avec cette carte » doit être cochée au lancement, sinon le test est refusé.
- **Plafond de 150 €** livraison comprise : au-delà, l'agent prend un article moins cher, ou s'arrête avant de payer.
- **Une seule tentative**, jamais une autre carte ni un autre moyen de paiement.
- **Replay privé**, visible seulement par votre équipe. Numéro, expiration et cryptogramme sont masqués dans le texte, et les captures sont **floutées dès que l'agent tape la carte** (un clic les affiche). Les captures sont effacées 4 h après le test.

Pour le préparer :

- **Moyen de paiement** : enregistrez la carte de l'équipe. Numéro, date et cryptogramme sont chiffrés et ne sont plus jamais affichés. Seuls le propriétaire et les admins gèrent la carte.
- **Comptes de test** (si le site exige un compte pour payer) : créez vous-même un compte de test sur le site, puis enregistrez-le. Le test tourne alors deux fois : sans compte, puis connecté. Les mots de passe sont rangés dans un coffre-fort chez H Company ; AgentProof ne les stocke pas et l'agent ne les voit jamais. Un compte par site.

Pour lancer le test : dans « Lancer un audit », choisissez **Tester le paiement** (avec l'audit) ou le type **Paiement seulement**.

## 12. Travailler en équipe

### Inviter un collègue

Dans **Équipe**, entrez son adresse e-mail. Il reçoit un lien valable **7 jours**, réservé à cette adresse.

### Les rôles

| Rôle | Ce qu'il peut faire |
|---|---|
| **Propriétaire** | Tout, et gère les membres. |
| **Admin** | Lance des audits, gère les automations, la carte et les comptes de test. |
| **Lecteur** | Lit les rapports. |

### Plusieurs équipes

Vous pouvez appartenir à plusieurs équipes, ou en créer une nouvelle depuis **Compte**. Passez de l'une à l'autre avec le **sélecteur d'équipe** en haut de la barre de gauche.

### Marque blanche (agences)

Dans **Équipe**, indiquez le nom et le logo à afficher : ils **remplacent AgentProof** sur les rapports de l'équipe, en ligne et en PDF. Laissez le nom vide pour revenir à AgentProof.

## 13. Crédits et tarifs

### Les crédits

**Une mission jouée par l'agent sur un site = un crédit.**

| Action | Crédits |
|---|---|
| Audit complet (5 missions) | 5 |
| Audit avec concurrent | 5 de plus pour le concurrent (compté mission par mission) |
| Ordinateur + Mobile | 10 |
| Mission ratée rejouée | 1 |
| Mission d'un audit automatique | 1 |
| Test de paiement | 2 |
| Vérification de page (automations) | 0, gratuit |

La page **Abonnement et crédits** montre les crédits utilisés ce mois-ci, par type et par site, et une projection de fin de mois. Vous êtes prévenu à **80 %** et à **100 %** du forfait, par e-mail et sur Slack si vous l'avez branché. Les crédits repartent le **1er de chaque mois**.

**Plafond par site** : dans Abonnement et crédits, l'équipe peut fixer un nombre maximum de crédits par site et par mois (tous appareils). Une fois ce plafond atteint, les audits automatiques sur ce site (page modifiée, mise en ligne, audit mensuel) ne partent plus jusqu'au 1er du mois, et l'automation note pourquoi. Un audit lancé à la main passe toujours. Laissez le champ vide pour ne fixer aucun plafond.

### Les offres

| Offre | Prix | Ce qu'elle comprend |
|---|---|---|
| **Gratuit** | 0 € | Le classement public, et 15 crédits par mois, soit jusqu'à 3 audits complets. |
| **Audit complet** | 490 € par site | Un rapport ponctuel sur un site, ordinateur ou mobile : missions, captures, replays, comparaison avec un concurrent, plan de corrections en PDF. |
| **Suivi mensuel** | 149 € par mois | Un audit complet automatique chaque mois, vos pages relues chaque jour et après chaque mise en ligne, des alertes Slack et e-mail, et 150 crédits par mois pour relancer des audits quand vous voulez (jusqu'à 30 audits, moins si des missions ratées sont rejouées). |
| **Agences** | 30 % de commission | Rapports et PDF en marque blanche, un espace d'équipe pour tous vos clients, 600 crédits par mois. Sur contact. |

**Pendant l'essai**, le paiement en ligne n'est pas encore ouvert : rien n'est bloqué ni facturé, même au-delà des crédits. L'audit lancé aujourd'hui est le même que l'audit complet à 490 €. Les prix affichés sont ceux qui s'appliqueront à l'ouverture du paiement, et le barème des crédits peut encore évoluer d'ici là.

## 14. Le classement public

Le **Classement**, accessible sans compte, compare des sites mode français : la part des missions où l'agent atteint le checkout, vérifiée par un juge visuel.

- Le score d'un site est la **moyenne des deux derniers audits** sur le même appareil, car un agent IA n'agit pas toujours exactement pareil.
- Le lien d'un site ouvre son dernier rapport.
- Les missions hors score (rupture de stock, anti-bot, mission impossible sur le catalogue, erreur de l'agent) ne comptent pas.

Votre site y figure et vous pensez que le résultat est faux ? Écrivez à l'équipe avec le lien du rapport : la capture et le replay sont vérifiés à la main, puis la mission est corrigée ou relancée.

La page **Méthode** détaille la façon dont les missions, le juge et le score fonctionnent.

## 15. Règles de l'agent, données et légalité

### Ce que l'agent ne fait jamais pendant un audit

- Il ne paie pas et ne valide aucune commande.
- Il ne crée pas de compte et ne saisit aucune donnée personnelle.
- Il ne résout aucun captcha : il s'arrête et note « anti-bot ».
- Il visite les sites avec un volume faible, sans rafale.

Le seul cas où l'agent paie, c'est le [test de paiement](#11-le-test-de-paiement-facultatif), que vous lancez vous-même avec la carte de votre équipe.

### Est-ce légal ?

L'agent visite des pages publiques comme un client, sans créer de compte, sans payer et sans contourner de protection. Si un site le bloque, la mission est notée « anti-bot » et sort du score. Un concurrent n'est visité que sur ses pages publiques.

### Vos données

- AgentProof garde votre e-mail, l'adresse des sites testés et les captures prises par l'agent.
- Les données sont hébergées en Europe (Paris).
- Le site n'utilise que les cookies nécessaires à son fonctionnement (session, équipe, langue) : aucun traceur, aucune publicité.

### L'agent utilisé

Holo, de H Company : il voit l'écran, clique et tape comme un humain, dans un navigateur dans le cloud. Le juge visuel et le plan de corrections viennent de modèles open source sur Hugging Face.

### Limites à connaître

- Un audit est une photo à un instant donné : un site change, d'où les automations et le suivi mensuel.
- Le mobile est un écran de téléphone simulé, pas un vrai smartphone.
- Le navigateur de l'agent tourne dans le cloud : certains anti-bots le bloquent, comme ils bloqueraient l'agent d'un vrai client. Ces missions sortent du score.

## 16. Questions fréquentes

**Combien de temps dure un audit ?**
La durée estimée s'affiche avant le lancement, d'après les derniers audits. Une mission prend en moyenne autour d'une minute et demie. Avec un concurrent ou en Ordinateur + Mobile, comptez environ le double.

**Un échec peut-il venir du hasard ?**
Chaque mission ratée est rejouée une fois, et c'est le second essai qui compte. Dans le classement, le score fait la moyenne des deux derniers passages.

**Puis-je tester un site qui n'est pas le mien ?**
En lançant un audit, vous confirmez gérer le site ou être autorisé à le tester. Un concurrent n'est visité que sur ses pages publiques.

**Que se passe-t-il quand je n'ai plus de crédits ?**
Pendant l'essai, rien n'est bloqué ni facturé. Les crédits repartent le 1er du mois.

**Comment ne plus recevoir les e-mails d'alerte ?**
Cliquez sur le lien de désinscription en bas de l'e-mail. Les liens de connexion et les rapports demandés continuent d'arriver.

**Où trouver de l'aide ?**
La page **Aide et questions fréquentes** (menu du haut) a une recherche qui comprend les fautes de frappe, en français et en anglais. Pour une question sur un rapport, écrivez à l'équipe en joignant son lien.

---

*AgentProof · Hackathon H Company × Hugging Face, novembre 2026.*
