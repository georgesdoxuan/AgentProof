# Aligner les catégories de blocage sur les preuves

- Type : bug
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
Sur le rapport Promod https://agentproof-iota-tawny.vercel.app/audit/8c843d3f-3d95-4834-aace-21880a85f499, le blocage de la mission « Filtre de prix » est intitulé « Bouton qui ne réagit pas ». L’observation décrit pourtant l’absence de bouton d’achat en ligne et la présence de « RÉSERVER EN MAGASIN ». Ces éléments ne prouvent pas qu’un bouton existant ne réagit pas.

## Demande
Afficher une catégorie et un libellé fidèles à l’observation. Pour cet exemple : achat en ligne indisponible sur le produit sélectionné, à vérifier, plutôt que bouton inactif. Vérifier s’il s’agit d’une indisponibilité produit ou d’une limite du parcours avant d’attribuer un défaut au site ; ne pas modifier le score sans justification.

## Comment vérifier
Sur ce cas, le rapport n’affirme plus qu’un bouton ne fonctionne pas sans preuve d’un clic sans effet. Un cas simulé de bouton présent mais inactif garde une catégorie adaptée. Les anciennes données et les libellés restent compatibles.

## Détails
2026-11-18 — Proposition validée par Mehdi pour transmission à Georges avant la démonstration de vendredi 11 h. web/lib/engine.ts et web/app/audit/[id]/page.tsx, règles de classification à coordonner avec Alexandre. Effort estimé : une demi-journée. Demande distincte des hypothèses de causes : elle concerne l’incohérence entre catégorie et observation.

## Réponse de Georges
- Statut : nouveau
