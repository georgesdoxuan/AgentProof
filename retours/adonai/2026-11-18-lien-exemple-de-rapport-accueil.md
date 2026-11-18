# Montrer un exemple de rapport depuis l'accueil

- Type : modification
- Priorité : important
- Auteur : adonai
- Date : 2026-11-18

## Constat
L'accueil propose seulement « Tester mon site » et « Voir le classement » (`web/app/page.tsx:35-38`). Pour voir ce qu'AgentProof livre (score, blocages, captures, replay, plan de corrections), il faut lancer un audit et attendre plusieurs minutes, ou deviner qu'il faut cliquer sur un site du classement.

Pendant le pitch de vendredi, le jury doit comprendre la valeur du produit tout de suite, sans attendre un audit en direct.

## Demande
Ajouter sur l'accueil un lien « Voir un exemple de rapport » qui ouvre un rapport choisi à l'avance. Il doit contenir au moins un vrai blocage compté, avec sa capture et son replay, et un plan de corrections. Un rapport à 100 % montre moins bien l'intérêt de l'outil.

## Comment vérifier
Sur l'accueil, un clic sur « Voir un exemple de rapport » ouvre un rapport avec au moins un blocage, sa capture et son replay.

## Détails
- Candidat : le rapport Promod (78 %, 7 missions réussies sur 9 d'après le classement du 18 novembre), à vérifier avant de le choisir.
- L'identifiant du rapport peut être une constante, ou une variable d'environnement pour le changer sans redéployer.

## Réponse de Georges
- Statut : nouveau
