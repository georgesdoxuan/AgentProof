# Juge : une fenêtre de connexion compte comme un checkout, d'où de possibles faux succès

- Type : bug
- Priorité : important
- Auteur : alexandre
- Date : 2026-11-18

## Constat
Le prompt du juge (`web/lib/engine.ts:756`) dit : « Login pages and login pop-ups count as checkout. »
Le succès d'une mission repose sur le verdict du juge seul (`engine.ts:471`), qui ne voit que la dernière capture.
Une fenêtre « Mon compte » ou « Se connecter » ouverte depuis une page produit ou depuis l'en-tête, sans passer par le panier, peut donc valider la mission. Le score du site est alors gonflé.
Le README dit que le juge « limite les faux succès » : ce cas n'est pas couvert.

## Demande
Une page ou une fenêtre de connexion ne compte comme checkout que si on y arrive après le panier, c'est-à-dire après un clic sur « Commander », « Valider mon panier » ou équivalent. Sinon, le run n'est pas un succès.

## Comment vérifier
Rejouer le juge (`scripts/rejudge.mjs`) sur les runs réussis du benchmark dont la dernière capture est une connexion : aucun ne doit rester réussi si l'agent n'était pas passé par le panier.

## Détails
Deux pistes simples, à combiner si possible :
1. Dans le prompt : « A login page or pop-up counts as checkout only if the URL contains checkout, commande, panier, cart, order, tunnel or similar. »
2. Dans `finalize` : si le juge dit checkout et `blocker_type` vaut `none`, mais que l'agent dit ne pas avoir atteint le checkout et que l'URL finale ne ressemble pas à une URL de commande, marquer le run « non vérifié » (success = null) plutôt que réussi.
Je peux m'occuper du nouveau prompt et de la mesure avant / après (rôle CAIO) si Georges valide la piste.

## Réponse de Georges
- Statut : nouveau
