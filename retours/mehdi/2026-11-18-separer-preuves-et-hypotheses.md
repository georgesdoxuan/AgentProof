# Distinguer observation et cause supposée dans les recommandations

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
Dans le rapport Celio, les recommandations affirment que le filtre de prix nécessite une authentification. La conclusion visible de la mission situe la demande de connexion après le clic sur « Passer la commande ». Les éléments affichés ne suffisent pas à établir que le filtre lui-même exige une connexion. Un avertissement général sur le texte IA existe déjà.

## Demande
Dans chaque recommandation, distinguer le fait observé, la cause éventuelle et la vérification proposée. Une cause non démontrée doit être formulée comme une hypothèse. Une connexion à l'entrée du checkout ne doit pas être automatiquement présentée comme un bug, puisque cette étape peut constituer une arrivée valide dans notre périmètre.

## Comment vérifier
Sur le cas Celio, le rapport n'affirme pas sans preuve que le filtre exige une connexion. Sur un cas ambigu, la cause est explicitement une hypothèse et une vérification concrète est proposée. Sur un blocage prouvé, le fait observé reste clairement indiqué avec sa preuve.

## Détails
Objectif : recommandations fiables pour une entreprise et défendables devant le jury. Effort estimé : une demi-journée. Composants : génération des recommandations dans web/lib/engine.ts et affichage dans web/app/audit/[id]/page.tsx. Sujet distinct de la cohérence des verdicts : cette demande concerne le niveau de certitude des causes proposées.

## Réponse de Georges
- Statut : nouveau
