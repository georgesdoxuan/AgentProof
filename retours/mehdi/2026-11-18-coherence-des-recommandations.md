# Corriger les recommandations contradictoires avec les missions

- Type : bug
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
Sur https://agentproof-iota-tawny.vercel.app/audit/7632aa2c-2b15-42aa-ace0-edbda292ba09, consulté le 18 novembre 2026, le score indique 100 %, cinq missions réussies et zéro bloquée. Le résumé affirme pourtant que le filtrage par prix a échoué en demandant une connexion, alors que cette mission est affichée réussie et indique avoir atteint le checkout.

## Demande
Les recommandations doivent être cohérentes avec les verdicts finaux. Chaque blocage présenté doit citer la mission et la preuve correspondantes. Une mission réussie ne doit pas être décrite comme échouée sans explication explicite d'un résultat distinct.

## Comment vérifier
Ouvrir le rapport Celio et tester la génération sur ces mêmes résultats. Le résumé ne présente plus le filtre de prix comme une mission échouée. Vérifier aussi un cas contenant une vraie mission bloquée : sa recommandation doit rester présente et liée à sa preuve.

## Détails
Objectif : crédibilité de la démonstration vendredi à 11 h. Effort estimé : une demi-journée, à confirmer par Georges. Composants à examiner : web/lib/engine.ts et web/app/audit/[id]/page.tsx. Ne pas masquer les échecs pour obtenir un bon score. Les données historiques peuvent nécessiter une régénération contrôlée du résumé.

## Réponse de Georges
- Statut : nouveau
