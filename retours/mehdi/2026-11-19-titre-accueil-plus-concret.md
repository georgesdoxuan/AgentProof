# Rendre le titre de l'accueil plus concret

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-19

## Constat
Le titre « Un agent IA essaie d'acheter sur ton site. » et le sous-titre « AgentProof te montre où il bloque. Preuves à l'appui. » laissent une partie des visiteurs sans comprendre ce qu'ils y gagnent : « un truc d'IA pour les sites de vente », « un peu comme un audit SEO ». 12 visiteurs disent ne pas voir le bénéfice, 5 confondent avec un audit SEO ou un outil de conversion.

## Demande
Remplacer le titre et le sous-titre de l'accueil (FR) par :
- Titre : « Vérifie qu'un agent IA peut acheter sur ta boutique. »
- Sous-titre : « Cookies, pop-up, sélecteur de taille : on te montre où il bloque, captures à l'appui, et quoi corriger. Gratuit, aucun achat réel. »
Adapter la version EN dans le même esprit.

## Comment vérifier
Sur l'accueil, en haut de page, ordinateur et mobile : le nouveau titre et le nouveau sous-titre s'affichent sans débordement à 375 px.

## Détails
Test du 19 nov 2026 avec le skill « visiteurs » (100 visiteurs simulés par IA à partir de vraies captures ordinateur et mobile de l'accueil ; 50 mobile, 50 ordinateur ; 60 cible, 25 proches, 15 hors cible). Résultat global : 76 % comprennent en 5 s, 87 % restent, 68 % trouvent le bouton, 18 % lanceraient un audit, 57 % « peut-être ». Rapport complet : `retours/mehdi/2026-11-19-test-visiteurs/rapport.html`. Visiteurs simulés : à confirmer avec de vrais utilisateurs.
- Titre testé contre 2 autres variantes, sur les mêmes 30 visiteurs : compréhension en 5 s 80 % contre 50 % avec le titre actuel (+30 points). Les autres variantes : 67 % et 77 %.
- Point de vigilance : la part qui « reste » passe de 80 % à 70 %, et l'échantillon de 30 contenait exprès beaucoup de visiteurs qui n'avaient pas compris, ce qui grossit le gain.
- Captures avec le nouveau titre : `2026-11-19-test-visiteurs/variante-3-desktop-fold.png` et `variante-3-mobile-fold.png`.
- « Gratuit » : à garder seulement tant que le paiement en ligne n'est pas actif (la page tarifs dit « lancer un audit depuis cette page ne coûte rien »).
- Fichier : `web/app/(accueil)/page.tsx:40-42`. Garder `web/app/layout.tsx:19` (description) cohérent.

## Réponse de Georges
- Statut : nouveau
