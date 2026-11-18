# Expliquer les bénéfices pour une entreprise sur l’accueil

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
L’accueil explique le fonctionnement et les livrables : missions, captures, replays et corrections. Les bénéfices pour l’équipe e-commerce restent surtout implicites.

## Demande
Ajouter un court bloc qui relie les livrables aux usages : repérer les obstacles des parcours testés, transmettre des preuves aux développeurs et suivre les corrections. Ne promettre un correctif vérifié que lorsqu’un retest valide existe réellement.

## Comment vérifier
Une personne découvrant l’accueil peut expliquer ce que son équipe peut faire avec le rapport. Chaque bénéfice correspond à une fonction disponible ; aucun gain de revenus ou de conversion non mesuré n’est annoncé.

## Détails
2026-11-18 — Demande validée par Mehdi pour la démonstration de vendredi à 11 h. Effort estimé : deux à trois heures. web/app/page.tsx. Présenter clairement le périmètre jusqu’à l’entrée du checkout et la limite entre observation et diagnostic.

## Réponse de Georges
- Statut : fait
- Bloc « Ce que ton équipe en fait. » dans « Ce que tu reçois » : repérer les obstacles, transmettre des preuves (capture, replay, plan), suivre les corrections (relancer un audit, se comparer à un concurrent). Chaque point correspond à une fonction existante. Aucun gain chiffré n'est annoncé.
- La phrase sous le bloc rappelle que le test s'arrête à l'entrée du checkout (paiement non testé) et que le rapport sépare observations et causes supposées.
- Fichier : `web/app/page.tsx`.
- Commit : fa425bf.
