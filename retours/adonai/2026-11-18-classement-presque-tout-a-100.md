# Le classement montre presque tous les sites prêts, ce qui affaiblit le pitch

- Type : feedback
- Priorité : important
- Auteur : adonai
- Date : 2026-11-18

## Constat
Sur https://agentproof-iota-tawny.vercel.app/classement, consulté le 18 novembre 2026, 6 sites sur 10 sont à 100 % (Celio, Sézane, Le Slip Français, Asphalte, Balibaris, Jules), et 9 sur 10 sont « Prêt pour les agents ». Seul Kiabi est bloquant, et c'est à cause d'une erreur de l'agent (voir `2026-11-18-kiabi-erreurs-outil-agent-hors-score.md`).

Le pitch s'appuie sur le chiffre « 63 % des responsables e-commerce disent que leur tunnel ne peut pas être finalisé par un agent IA ». Le classement suggère l'inverse. Le jury risque de demander : « Si tout le monde est prêt, à quoi sert AgentProof ? »

C'est en partie normal : on a sorti du score les erreurs de l'agent, ce qui rend le classement plus juste. Mais le test s'arrête à l'entrée du checkout, là où les vrais blocages commencent (compte obligatoire, paiement).

## Demande
Que la démo montre des blocages réels sans rendre le score moins juste. On en décide en équipe. Trois pistes, de la plus petite à la plus grande :
1. Lancer le benchmark en mobile, si des sites y bloquent davantage, et montrer les deux classements (la colonne appareil affiche aujourd'hui « Ordinateur » partout).
2. Dans chaque rapport, afficher ce que l'agent a dû contourner même quand il réussit (pop-ups, bandeaux cookies, recherche difficile), à partir des blocages déjà relevés.
3. Dans le pitch, présenter les résultats des tests de paiement internes comme la suite logique, ce qui se passe après l'entrée du checkout.

## Comment vérifier
La démo montre au moins un site avec un blocage réel, dû au site et compté dans le score, et le pitch explique pourquoi la plupart des sites passent l'entrée du checkout.

## Détails
Je n'ai pas vérifié si le mobile bloque davantage : il faut lancer les audits pour le savoir (crédits H).

## Réponse de Georges
- Statut : nouveau
