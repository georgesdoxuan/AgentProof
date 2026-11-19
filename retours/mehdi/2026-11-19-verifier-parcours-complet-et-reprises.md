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
- Statut : fait. Parcours vérifié le 19/11 en local (next dev sur le Mac de Georges, connexion dev, aucun audit lancé, aucun e-mail réel), captures clair/sombre à 1440 et 390 px. Corrections apportées dans la PR #68 :
  - Lancement refusé (adresse invalide, e-mail invalide, options incompatibles, carte manquante, trop d'audits en une heure, file pleine, missions invalides, erreur interne) : avant, page en texte brut et saisie perdue. Maintenant, retour sur Espace › Nouvel audit, formulaire rempli, bandeau « Audit non lancé » avec la raison et quoi faire. Codes seulement dans l'URL.
  - Lien de connexion expiré ou déjà utilisé : avant, e-mail et destination perdus. Maintenant, ils sont conservés (site saisi sur l'accueil compris).
  - Lien non reçu : l'écran « Regarde ta boîte mail » ajoute « Pas reçu ? » (spams, onglet Promotions, adresse) et « Demander un nouveau lien ».
  - Attente : les missions en file d'attente sont expliquées dans le rapport (la page peut être fermée, le rapport reste dans l'espace).
  - Résultat partiel : une mission non jouée suite à une erreur d'AgentProof est annoncée « Résultat partiel · erreur de notre côté, hors score, pas un défaut du site », avec « Relancer » (passage complet, sans réutiliser le rapport des 7 derniers jours).
  Scénarios (attendu → obtenu) : adresse localhost → retour au formulaire, adresse gardée, bandeau ✓ ; e-mail invalide → bandeau, champ e-mail visible et corrigeable ✓ ; lien déjà servi → erreur « lien expiré », e-mail et destination gardés ✓ ; « Demander un nouveau lien » → même adresse, même destination ✓ ; relance (force=1) → bandeau « nouveau passage complet » ✓. Déjà en place, non réimplémentés : relance d'un rapport existant (< 7 j) au lieu d'un doublon, missions bloquées plus de 20 min clôturées (« stale »), mission en erreur marquée « Non vérifiée » et hors score, crédits jamais bloquants pendant l'essai, notification e-mail en échec sans effet sur le rapport (toujours dans l'espace). Non testés : notification réellement refusée et appel H lent (il faudrait un vrai audit et un vrai envoi : autorisation distincte). Aucun gain de temps annoncé.
