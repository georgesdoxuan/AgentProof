# Montrer le produit réel dans une démonstration courte

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-19

## Constat
L’accueil présente une scène fictive de blocage et propose déjà un lien vers un rapport réel. La comparaison avec Apple suggère de mieux montrer le produit lui-même ; aucun test utilisateur n’a mesuré ici l’effet de cette proposition.

## Demande
Ajouter sur l’accueil une démonstration courte et accessible montrant une mission réelle, sa capture puis la correction proposée. Réutiliser un audit terminé et relu, sans lancer de session à la consultation. Distinguer clairement enregistrement et agent en direct. Conserver le lien existant vers le rapport complet.

## Comment vérifier
Sans connexion, on comprend ce que reçoit le client. La démonstration fonctionne sur mobile, n’impose pas de son ou d’animation et possède une alternative statique. Aucun appel H n’est déclenché. Captures, résultat et correction concernent le même audit et ne montrent aucune donnée personnelle.

## Détails
2026-11-19 — Proposition validée par Mehdi après comparaison des pages publiques Apple et AgentProof. Reprendre des principes de clarté du parcours, pas copier le site Apple. Effort estimé : une demi-journée pour un montage simple ou une séquence de trois captures. Sujet distinct de 2026-11-18-exemple-rapport-accueil.md : le lien existe déjà, la demande porte sur la présentation visuelle du livrable réel.

## Réponse de Georges
- Statut : fait. Nouvelle section « Un vrai rapport, en trois écrans » après l'accroche : 1. la mission (titre et compte rendu de l'agent, mot pour mot), 2. la capture avec le verdict, 3. la correction proposée (Observé / Hypothèse / Correction possible), tout issu du même audit d'exemple (Promod, ordinateur, 17/11, mission 2 « Menu + filtre taille »). Lu en base au rendu, aucun appel H (vérifié : l'accueil n'appelle que Supabase pour l'image). Marquée « Enregistrement, pas un agent en direct ». Écrans fixes : pas de vidéo, de son ni d'animation ; capture avec texte alternatif. Liens « Voir ce rapport complet » et « Rejouer la mission pas à pas ». La scène animée du haut est désormais légendée « Illustration ». Mission changeable sans code (DEMO_RUN_ID). Aucune donnée personnelle : pages produit publiques. PR #68.
