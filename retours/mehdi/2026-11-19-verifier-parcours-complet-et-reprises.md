# Vérifier le parcours complet et rendre les incidents actionnables

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-19

## Constat
Les pages publiques annoncent une connexion par e-mail, un rapport progressif puis une notification. La revue comparative n’a pas exercé les écrans connectés ni les erreurs ; ce retour demande une vérification et ne prétend pas qu’un incident a été reproduit.

## Demande
Vérifier en environnement de test le parcours formulaire → connexion → lancement → attente → rapport → notification. Pour chaque incident confirmé, proposer une action compréhensible : lien de connexion expiré ou non reçu, quota insuffisant, audit bloqué, résultat partiel, notification échouée. Préserver les données saisies et les identifiants de reprise pour éviter les doublons. Si les états existent déjà, joindre les preuves plutôt que les réimplémenter.

## Comment vérifier
Scénarios documentés avec résultat attendu/obtenu et preuves anonymisées : parcours normal, lien expiré, appel lent, erreur temporaire, reprise de page et notification refusée. Les simulations n’utilisent ni paiement ni e-mail réel. Les vrais tests payants et envois nécessitent une autorisation distincte. Aucun état ne transforme une erreur AgentProof en défaut du site.

## Détails
2026-11-19 — Proposition validée par Mehdi après comparaison des pages publiques Apple et AgentProof. Reprendre des principes de clarté du parcours, pas copier le site Apple. Effort estimé : une demi-journée de validation ciblée, corrections selon constats. Ce sujet couvre l’expérience utilisateur de bout en bout ; les trois demandes de performance déjà présentes restent les références pour le moteur. Mesurer attente et rapport complet séparément ; ne pas annoncer de gain non mesuré.

## Réponse de Georges
- Statut : nouveau
