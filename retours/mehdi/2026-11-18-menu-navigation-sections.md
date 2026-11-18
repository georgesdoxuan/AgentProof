# Naviguer vers les sections de l’accueil depuis le menu

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
L’utilisateur veut retrouver les différentes parties de la page d’accueil dans le menu du haut et cliquer pour descendre directement à la partie choisie. Lors de la revue précédente, le menu proposait Classement, Connexion et Tester mon site, sans accès à toutes les sections de présentation.

## Demande
Sur l’accueil, proposer dans le menu les liens « Comment ça marche », « Ce que tu reçois », « Tester mon site » et « Classement ». Chaque lien conduit à la section correspondante de la même page, avec un défilement doux. Réutiliser les sections existantes et adapter les intitulés si nécessaire, sans créer de contenu artificiel pour remplir le menu. Le menu reste visible pendant le défilement. Sur mobile, proposer une présentation compacte utilisable sans débordement. Conserver l’accès à Connexion et à la page complète du classement.

## Comment vérifier
Depuis le haut puis depuis le bas de l’accueil, cliquer sur chaque rubrique : la bonne section devient visible, avec son titre non masqué par le menu fixe. Le lien Classement vise le classement de l’accueil ; un accès distinct permet de consulter le classement complet. Depuis une page de rapport, les liens vers les sections ramènent à la bonne section de l’accueil si ce menu est partagé. Tester au clavier et sur un écran de 375 px : les liens sont accessibles, le menu mobile se ferme après sélection et aucun défilement horizontal n’est nécessaire. Respecter la préférence de réduction des animations : pas de défilement animé imposé dans ce cas. L’ouverture directe d’une URL avec son ancre atteint la bonne section.

## Détails
2026-11-18 — Demande explicitement validée par Mehdi pour dépôt chez Georges. Objectif : accéder rapidement aux explications et au formulaire pendant la démonstration. Effort estimé : deux à quatre heures, à confirmer selon la navigation actuelle. Composants à examiner : web/app/page.tsx, navigation partagée et styles globaux. Préférer des liens d’ancre natifs, des identifiants de section stables et une marge de défilement correspondant à la hauteur du menu. Ne pas remplacer les destinations utiles hors de l’accueil par des ancres inexistantes.

## Réponse de Georges
- Statut : fait
- Sur l'accueil, une seconde barre collante sous l'en-tête : « Pourquoi », « Ce que tu reçois », « Tester », « Classement ». Ce sont des ancres natives (`#pourquoi`, `#ce-que-tu-recois`, `#tester`, `#classement`) avec `scroll-mt` à la hauteur des deux barres. Le défilement est doux, sauf si l'utilisateur a demandé moins d'animations (`prefers-reduced-motion`).
- Il n'y a pas de section « Comment ça marche » : le lien « Pourquoi » vise le texte d'introduction existant, sans contenu ajouté. L'en-tête garde Classement (page complète) et Connexion.
- À 375 px, la barre tient sans menu replié. L'en-tête débordait de 13 px : c'est corrigé, il n'y a plus de défilement horizontal.
- Fichiers : `web/app/page.tsx`, `web/app/globals.css`, `web/app/nav.tsx`.
- Commit : fa425bf.
