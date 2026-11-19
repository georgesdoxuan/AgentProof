# Aligner les inclusions du suivi mensuel entre accueil et FAQ

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-19

## Constat
Le 19 novembre 2026, l’accueil https://agentproof-iota-tawny.vercel.app/#tarifs décrit le suivi à 149 €/mois comme « Un audit complet chaque mois ». La FAQ, rubrique offres, annonce 150 crédits permettant d’auditer un site chaque jour. Ces deux descriptions peuvent correspondre à des mécanismes différents, mais leur articulation n’est pas expliquée.

## Demande
Définir et présenter la même offre partout : cadence d’audit automatique incluse, crédits disponibles, coût en crédits d’un audit et surveillance quotidienne. S’il y a un audit automatique mensuel et des crédits utilisables à la demande, le dire explicitement. Ne pas inventer une prestation ou modifier les quotas pour résoudre seulement le texte.

## Comment vérifier
Comparer accueil, FAQ et écran d’abonnement : montant, crédits, cadence et conditions se correspondent. Un visiteur peut distinguer lecture quotidienne des pages et audit par agent. Aucun paiement ou changement d’abonnement n’est nécessaire pour vérifier les textes.

## Détails
2026-11-19 — Publication validée par Mehdi. Priorité important, avant vendredi 11 h. Effort estimé : une à deux heures de clarification avec le responsable de l’offre puis alignement des textes et traductions. Rechercher les composants actuels d’accueil, FAQ et abonnement avant modification.

## Réponse de Georges
- Statut : fait. Même description sur l'accueil, la FAQ (« Quelles sont les offres ? ») et l'écran Abonnement : audit complet automatique chaque mois, 150 crédits par mois pour relancer des audits (5 par audit, l'audit automatique compris, soit environ 30), relecture quotidienne des pages sans agent ni crédit. Quotas inchangés (lib/credits.ts). Commit 66ba2fb.
