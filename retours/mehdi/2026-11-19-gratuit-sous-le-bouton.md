# Dire sous « Tester mon site » que c'est gratuit et ce qu'il faut fournir

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-19

## Constat
En haut de l'accueil, rien ne dit que le test est gratuit ni ce qu'on va demander. La gratuité n'apparaît qu'en petit sous les tarifs (« lancer un audit depuis cette page ne coûte rien »), après les prix à 490 € et 149 €. L'encadré « Après le clic » n'est visible qu'au formulaire (écran 6 sur ordinateur, 9 sur mobile). 10 visiteurs hésitent pour cette raison : « Je ne sais pas combien ça coûte ni si c'est gratuit avant de donner l'adresse de mon site. »

## Demande
Sous les boutons du haut de l'accueil, une ligne courte : « Gratuit · ton URL et ton e-mail · rapport en 10 à 20 min ».

## Comment vérifier
Sur l'accueil, ordinateur et mobile, la ligne est visible sans défiler, juste sous « Tester mon site ».

## Détails
Test du 19 nov 2026 avec le skill « visiteurs » (100 visiteurs simulés par IA à partir de vraies captures ordinateur et mobile de l'accueil ; 50 mobile, 50 ordinateur ; 60 cible, 25 proches, 15 hors cible). Résultat global : 76 % comprennent en 5 s, 87 % restent, 68 % trouvent le bouton, 18 % lanceraient un audit, 57 % « peut-être ». Rapport complet : `retours/mehdi/2026-11-19-test-visiteurs/rapport.html`. Visiteurs simulés : à confirmer avec de vrais utilisateurs.
- Ne l'afficher que tant que le paiement en ligne n'est pas actif. Les durées reprennent celles de l'encadré « Après le clic ».
- Fichier : `web/app/(accueil)/page.tsx` (bloc des boutons autour de la ligne 46).

## Réponse de Georges
- Statut : nouveau
