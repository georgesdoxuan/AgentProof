# Expliquer le nombre de missions et la date du classement

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
L’accueil annonce cinq missions par audit, mais le classement affiche parfois dix missions comptées pour un site et renvoie vers un rapport de cinq missions. La règle d’agrégation n’est pas expliquée à cet endroit.

## Demande
Afficher une explication courte fondée sur le calcul réel du classement : audits et missions agrégés, appareil ou périmètre pertinent, ainsi qu’une date ou période de référence. Vérifier le calcul avant de choisir le texte ; ne pas supposer que le total inclut nécessairement plusieurs appareils.

## Comment vérifier
Sur l’exemple Celio, le visiteur comprend pourquoi le classement affiche dix missions alors que le rapport lié en présente cinq. Le texte correspond à la requête réelle, aux exclusions et à la période retenue.

## Détails
2026-11-18 — Demande validée par Mehdi pour la démonstration de vendredi à 11 h. Effort estimé : une à trois heures selon le calcul. web/app/page.tsx, web/app/classement/page.tsx et composant ou requête qui agrège les scores. Cette demande porte sur l’agrégation du classement, pas sur le libellé du score individuel déjà signalé.

## Réponse de Georges
- Statut : nouveau
