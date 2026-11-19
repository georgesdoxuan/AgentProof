# Limiter la conclusion du test de paiement à la preuve observée

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
La section « La suite : le paiement » de https://agentproof-iota-tawny.vercel.app/methode affirme qu’avec de l’argent sur la carte « la commande serait passée ». Un refus bancaire établit au mieux la transmission d’une tentative, pas la réussite future du paiement ni la confirmation d’une commande. Aucun paiement n’a été exécuté pendant cette revue.

## Demande
Remplacer cette conclusion par une formulation bornée aux éléments disponibles : « Tentative transmise à la banque ; réussite du paiement et confirmation de commande non démontrées », si la transmission est effectivement documentée. Distinguer la trace visible du site d’une preuve bancaire indépendante lorsqu’elle manque.

## Comment vérifier
La méthode conserve les résultats observés sans garantir qu’une carte approvisionnée aurait permis une commande. Aucun nouveau test de paiement n’est nécessaire. Rechercher les formulations équivalentes dans les textes publics concernés pour éviter une contradiction.

## Détails
2026-11-18 — Proposition validée par Mehdi pour transmission à Georges avant la démonstration de vendredi 11 h. web/app/methode/page.tsx, textes ou traductions associés. Effort estimé : trente minutes. Modification éditoriale ; aucune donnée de carte à ajouter et aucun paiement, audit ou e-mail à déclencher.

## Réponse de Georges
- Statut : fait. /methode (FR et EN) : « la tentative a été transmise à la banque, mais la réussite du paiement et la confirmation de commande ne sont pas démontrées ».
- Commit : 37f407c (PR feat/chantiers-audit)
