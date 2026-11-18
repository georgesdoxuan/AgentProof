# Préserver le temps des audits face aux tâches de surveillance

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
Revue statique : après le traitement des missions et closeAudits(), tick() attend successivement runStaticChecks(), runMonthlyAudits() et runDueAutomations(). La route du tick dispose de 60 secondes. La surveillance partage donc le budget de temps des audits. Aucun dépassement effectif n’a été reproduit pendant cette analyse.

## Demande
Faire passer les audits en priorité et n’engager une tâche de surveillance que si le temps restant le permet. Reporter les tâches non terminées de façon persistante. Envisager une séparation légère dans l’architecture existante seulement si la mesure la justifie. Éviter qu’une surveillance régulièrement reportée soit oubliée.

## Comment vérifier
Simuler une surveillance lente et plusieurs audits en attente : le traitement prioritaire des missions avance et le tick reste dans sa durée configurée. Au passage suivant, la tâche reportée est reprise une seule fois. Simuler deux ticks concurrents : pas d’audit récurrent ni d’alerte en doublon. Vérifier aussi l’absence de famine des tâches de surveillance.

## Détails
2026-11-18 — Demande validée par Mehdi pour réduire le délai jusqu’au rapport exploitable avant vendredi 11 h. web/lib/engine.ts, web/lib/automations.ts, web/app/api/tick/route.ts. Conserver les échéances et la dernière référence valide. Mesurer durée par phase, attente en file et ancienneté de la tâche de surveillance la plus ancienne. Effort estimé : une demi-journée à une journée pour une limite de temps et un report sûrs, à confirmer par Georges. Conserver les quotas et la fréquence d’appels actuels tant que leurs limites ne sont pas vérifiées. Aucun gain chiffré n’est annoncé sans mesure. Conserver le nombre de missions, le juge, les preuves et les contrôles de sécurité.

## Réponse de Georges
- Statut : nouveau
