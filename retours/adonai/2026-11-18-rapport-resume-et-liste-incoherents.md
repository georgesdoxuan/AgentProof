# Le rapport compte des missions hors score que la liste affiche « Bloquée »

- Type : bug
- Priorité : important
- Auteur : adonai
- Date : 2026-11-18

## Constat
Sur le rapport Kiabi https://agentproof-iota-tawny.vercel.app/audit/190bd9ee-16d1-4eb9-be5b-e998ba134829, consulté le 18 novembre 2026 :
- le résumé annonce 0 réussie, 3 bloquées, 2 hors score ;
- la liste des missions affiche 4 « Bloquée » et 1 « Non vérifiée », et aucune mission marquée « hors score ».

La mission « Recherche + taille », bloquée par l'anti-bot, compte comme hors score dans le résumé mais s'affiche « Bloquée » en rouge dans la liste. Le lecteur ne sait pas quelles missions sont hors score, ni pourquoi.

## Demande
Chaque mission hors score doit être marquée comme telle dans la liste, avec sa raison (anti-bot, rupture de stock, mission impossible, agent à court d'étapes). Les chiffres du résumé et de la liste doivent correspondre.

## Comment vérifier
Sur le rapport Kiabi, la mission anti-bot affiche « Hors score » avec sa raison, et le nombre de missions bloquées de la liste est égal à celui du résumé.

## Détails
- `web/lib/ui.tsx:73-79` : le statut d'un run vaut « Bloquée » dès que `success === false`, sans regarder si `blocker_type` est dans `EXCLUDED`.
- `web/lib/ui.tsx:165` et `:178` : le résumé, lui, sépare bien les runs exclus.

## Réponse de Georges
- Statut : nouveau
