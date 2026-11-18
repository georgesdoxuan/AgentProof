# « Blocage principal » du classement affiche des causes hors score

- Type : bug
- Priorité : important
- Auteur : adonai
- Date : 2026-11-18

## Constat
Sur https://agentproof-iota-tawny.vercel.app/classement, consulté le 18 novembre 2026, des sites à 100 % affichent un blocage principal :
- Balibaris : 100 %, « 5 sur 5 », blocage principal « Mission impossible sur ce catalogue ».
- Sézane : 100 %, « 9 sur 9 », blocage principal « L'agent a manqué d'étapes ».
- Bonobo : 89 %, « Prêt pour les agents », blocage principal « L'agent a manqué d'étapes ».

Un lecteur comprend que ces sites ont un défaut, alors que ces causes ne viennent pas du site et sont exclues du score.

## Demande
La colonne « Blocage principal » ne doit montrer que des blocages qui comptent dans le score. Un site sans échec compté affiche « Aucun ».

## Comment vérifier
Sur /classement, Balibaris et Sézane affichent « Aucun ». Le blocage principal de Bonobo est un blocage compté dans le score, ou « Aucun ».

## Détails
- `web/app/classement/board.tsx:11-16` : `topBlocker` compte tous les runs `success = false`, y compris les types de `EXCLUDED` (`web/lib/engine.ts:45`). Il suffit d'ignorer ces types dans le comptage.
- Le texte de la page dit « Rupture de stock et anti-bot restent hors score », mais `EXCLUDED` exclut aussi « Mission impossible sur ce catalogue » et « L'agent a manqué d'étapes ». Le texte peut citer les quatre.

## Réponse de Georges
- Statut : fait
- `topBlocker` (`web/app/classement/board.tsx`) ignore les types de `EXCLUDED`. Balibaris, Sézane et Bonobo affichent « Aucun ».
- Le texte « Score » de la page cite toutes les causes hors score : rupture de stock, anti-bot, mission impossible, et les échecs dus à l'agent (étapes épuisées, erreur d'outil).
