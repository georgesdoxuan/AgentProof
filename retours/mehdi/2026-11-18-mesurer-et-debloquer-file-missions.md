# Mesurer puis réduire l’attente avant les missions suivantes

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
Revue statique : tick() parcourt les sessions terminées et attend finalize(), notamment la vérification visuelle, avant de calculer les places libres et lancer les runs suivants. La présence de ce chemin séquentiel est vérifiée ; son impact réel n’est pas mesuré. Des protections existent déjà : budget d’appels H, limite de sessions, réservation conditionnelle des runs et clé d’idempotence.

## Demande
Mesurer le délai entre fin d’exécution d’une session et lancement des missions suivantes. Si la vérification est un goulot mesuré, découpler prudemment la collecte et la vérification visuelle du lancement, sans perdre les preuves ni dépasser les quotas. Ne pas libérer une place H tant que la session est réellement active. Le rapport doit distinguer exécution terminée, vérification en cours et rapport complet.

## Comment vérifier
Comparer avant/après avec mêmes missions simulées, mêmes quotas et mêmes latences. Quand un juge est lent, une session réellement terminée ne doit pas empêcher inutilement le lancement autorisé suivant. Deux ticks simultanés ne doivent ni lancer une même mission deux fois ni dépasser le plafond global. Un état incertain conserve sa vérification en attente.

## Détails
2026-11-18 — Demande validée par Mehdi pour réduire le délai jusqu’au rapport exploitable avant vendredi 11 h. web/lib/engine.ts : tick(), finalize(), closeAudits() ; composant de rafraîchissement du rapport. D’abord relever attente en file, exécution, juge, recommandations et rapport réellement exploitable. finished_at de l’audit est écrit avant les recommandations : ne pas le présenter seul comme la fin du rapport complet. Si l’instrumentation supplémentaire est nécessaire, relever aussi la fin des recommandations. Médiane/p95 seulement avec échantillon suffisant. Effort : une demi-journée de mesure puis décision sur un changement ciblé ; découplage estimé un à deux jours si justifié. Vérifier les quotas effectifs H/HF avant tout parallélisme ; ne pas augmenter la fréquence du cron. Aucun gain chiffré n’est annoncé sans mesure. Conserver le nombre de missions, le juge, les preuves et les contrôles de sécurité.

## Réponse de Georges
- Statut : nouveau
