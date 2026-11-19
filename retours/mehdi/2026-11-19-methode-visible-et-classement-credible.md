# Rendre la méthode visible depuis le haut de l'accueil

- Type : modification
- Priorité : bonus
- Auteur : mehdi
- Date : 2026-11-19

## Constat
16 visiteurs veulent comprendre la méthode avant de donner leur site : quel agent, combien d'essais, comment le score est calculé. Le lien « Méthode » n'existe qu'en pied de page (écran 9 sur ordinateur, 15 sur mobile). 5 visiteurs trouvent aussi peu crédible le top 5 du classement de l'accueil, tous à 100 % (Asphalte, Celio, Jules, Sézane, Bonobo) : « Un classement où tout le monde a 100 % ne me dit pas si l'outil est exigeant. »

## Demande
1. Ajouter « Méthode » dans la barre des sections du haut de l'accueil (à côté de Pourquoi, Ce que tu reçois, Tester, Classement, Tarifs), vers /methode.
2. Sous le classement de l'accueil, indiquer combien de sites sont classés au total et rappeler l'écart ordinateur/mobile déjà mesuré (96 % contre 57 % sur mobile), pour montrer que tout le monde ne passe pas.

## Comment vérifier
Depuis le haut de l'accueil, un clic sur « Méthode » ouvre /methode. Sous le classement, on lit le nombre de sites classés et l'écart mobile.

## Détails
Test du 19 nov 2026 avec le skill « visiteurs » (100 visiteurs simulés par IA à partir de vraies captures ordinateur et mobile de l'accueil ; 50 mobile, 50 ordinateur ; 60 cible, 25 proches, 15 hors cible). Résultat global : 76 % comprennent en 5 s, 87 % restent, 68 % trouvent le bouton, 18 % lanceraient un audit, 57 % « peut-être ». Rapport complet : `retours/mehdi/2026-11-19-test-visiteurs/rapport.html`. Visiteurs simulés : à confirmer avec de vrais utilisateurs.
- Suite de `retours/adonai/2026-11-18-classement-presque-tout-a-100.md` (fait côté rapport et page classement) : il s'agit ici du bloc classement de l'accueil, qui ne montre que les 5 premiers.
- Fichiers : `web/app/(accueil)/page.tsx`, `web/app/nav.tsx`.

## Réponse de Georges
- Statut : nouveau
