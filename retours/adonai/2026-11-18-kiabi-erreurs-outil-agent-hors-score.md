# Kiabi classé 0 % à cause d'une erreur d'outil de l'agent

- Type : bug
- Priorité : bloquant
- Auteur : adonai
- Date : 2026-11-18

## Constat
Sur https://agentproof-iota-tawny.vercel.app/classement, consulté le 18 novembre 2026, Kiabi est dernier : 0 %, « 0 sur 4 », verdict « Bloquant ».

Le rapport https://agentproof-iota-tawny.vercel.app/audit/190bd9ee-16d1-4eb9-be5b-e998ba134829 montre que les 3 missions bloquées comptées dans le score échouent toutes à cause de l'outil de défilement de l'agent, pas du site (la 4e mission bloquée l'est par l'anti-bot, hors score) :
- « Filtre de prix » : l'agent ne peut pas faire défiler le panneau de filtres, avec l'erreur « scroll_element mal formaté ». Blocage affiché : « Filtres inutilisables ».
- « Menu + filtre taille » et « Variante couleur » : le défilement ne marche pas sur la fiche produit. Blocage affiché : « Sélecteur de taille / variante ».
- « Article en promo » : boucle d'erreurs de validation de l'outil scroll_web.

J'avais déjà vu le même problème de défilement sur Kiabi pendant ma vérification manuelle du 17 novembre (runs 10, 11 et 12). Les autres sites n'ont pas ce problème.

## Demande
Une mission qui échoue parce que l'outil de l'agent renvoie une erreur ne doit pas compter contre le site : elle doit être hors score, comme « L'agent a manqué d'étapes ». Le blocage affiché doit dire que l'agent est en cause.

En attendant, Kiabi ne doit pas apparaître à 0 % « Bloquant » dans le classement public. On le marque « à confirmer », ou on le retire jusqu'à un nouvel audit.

Raison éthique et juridique : un classement public qui note une marque nommée à 0 % sur la base d'erreurs de notre agent peut être considéré comme du dénigrement.

## Comment vérifier
- Sur /classement, Kiabi n'affiche plus 0 % « Bloquant », ou il est marqué « à confirmer ».
- Dans le rapport Kiabi, les missions concernées sont marquées hors score, avec une cause liée à l'agent.
- Un nouvel audit de Kiabi ne compte plus contre le site les échecs dus à l'outil de défilement.

## Détails
- Piste : quand la réponse de l'agent ou ses événements de session contiennent une erreur d'outil (« mal formaté », « validation error », « scroll_web »), classer le run en `agent_out_of_steps` ou dans un nouveau type réservé à l'agent, déjà exclu du score via `EXCLUDED` (`web/lib/engine.ts:45`).
- C'est aussi une surprise de l'Agent API à noter dans la section « Retours » du README.

## Réponse de Georges
- Statut : fait
- Confirmé dans les sessions H : sur Kiabi, Holo envoie `scroll_web` avec `scroll_element` sous forme de chaîne au lieu d'un objet. Il y a 8 à 19 appels rejetés (`validation_errors`) sur 30 étapes.
- Nouveau blocage `agent_tool_error` (« Erreur d'outil de l'agent »), hors score et réservé à l'agent (`EXCLUDED`, `AGENT_ONLY` dans `web/lib/engine.ts`, vue `site_scores` mise à jour). Le moteur l'attribue quand une mission échoue avec au moins 5 appels d'outil rejetés ET que l'agent attribue lui-même l'échec au défilement ou à son outil. Le moteur lit maintenant toute la session (200 événements) dans la même requête.
- Runs existants reclassés selon la même règle : Kiabi 114, 115, 116 et 12, Bonobo 44. Promod 19 et 20 ont aussi des appels rejetés (7 et 11), mais l'agent y nomme un blocage du site (pas de bouton « Ajouter au panier », pas de sélecteur de taille) : ils restent comptés.
- Classement : Kiabi n'a plus de mission comptée et affiche « À confirmer », sans score. Bonobo passe de 89 % à 100 %. Le rapport Kiabi affiche les missions « Hors score » avec la cause, et son plan de corrections est régénéré.
- Surprise notée dans la section « Retours » du README. Définition ajoutée dans CONTEXT.md § 6.
