# Accéder aux preuves depuis chaque correction

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
Dans le rapport Promod, les corrections citent les titres de missions, mais les captures et replays se trouvent dans la liste de missions plus bas. Le lecteur doit retrouver lui-même la preuve correspondant au problème.

## Demande
Ajouter dans chaque bloc de correction un accès « Voir la mission concernée » vers son ancre et un accès à sa capture. Quand un problème regroupe plusieurs missions, identifier les missions liées sans choisir une preuve arbitraire. Réutiliser les preuves disponibles, sans appel supplémentaire à l’agent.

## Comment vérifier
Depuis chaque correction du rapport Promod, le lien atteint la bonne mission et son titre reste visible sous la navigation fixe. La capture correspond à cette mission. Tester aussi un problème avec plusieurs missions et une capture absente : pas de lien cassé ni de lien trompeur.

## Détails
2026-11-18 — Proposition validée par Mehdi pour transmission à Georges avant la démonstration de vendredi 11 h. web/app/audit/[id]/page.tsx et structure des recommandations si le lien aux identifiants manque. Effort estimé : une à deux heures si les identifiants sont disponibles. Préserver le lien structuré aux missions plutôt qu’une correspondance fragile sur leur seul titre.

## Réponse de Georges
- Statut : fait. Chaque bloc du plan de corrections affiche « Voir la mission N » pour chaque mission qu'il cite (reconnue par son titre), vers son ancre ; la capture et le replay sont dans la mission et dans le ticket copié. Aucun appel à l'agent.
- Commit : 37f407c (PR feat/chantiers-audit)
