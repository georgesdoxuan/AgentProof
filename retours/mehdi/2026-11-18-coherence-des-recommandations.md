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
- Statut : fait
- Le plan de corrections ne laisse plus l'IA écrire les constats. Le code les construit à partir des verdicts : seules les missions bloquées par le site apparaissent, regroupées par blocage, avec le titre de chaque mission et le texte observé (`writeRecommendations` dans `web/lib/engine.ts`). Une mission réussie ne peut plus être présentée comme un échec. Si aucune mission n'est bloquée, le texte est fixe et l'IA n'est pas appelée.
- Les missions hors interface (rupture, mission impossible, agent à court d'étapes) et les missions non vérifiées sont listées à part, sans correction.
- Régénération contrôlée faite sur Celio (`7632aa2c…`) et adidas.fr (`67230b35…`), anciens textes sauvegardés. Celio affiche maintenant : « Aucun blocage observé : 5 missions sur 5 atteignent l'entrée du checkout… ». adidas garde ses deux blocages réels (compte obligatoire sur 3 missions, bouton sur 1), chacun lié à ses missions.
- Commit : voir `git log` (« feat(audit): plan de corrections fondé sur les verdicts… »).
