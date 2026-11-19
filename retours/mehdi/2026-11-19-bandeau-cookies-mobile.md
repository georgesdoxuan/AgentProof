# Le bandeau cookies cache le haut de l'accueil sur mobile

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-19

## Constat
À la première visite, le bandeau d'information cookies couvre 21 % du haut de page sur mobile (iPhone 13) et reste en bas de chaque écran tant qu'on n'a pas cliqué « OK ». Sur mobile, le gros bouton « OK » attire l'œil autant que « Tester mon site ». 23 visiteurs sur 100 s'en plaignent ; plusieurs relèvent l'ironie pour un produit dont la démo montre un agent bloqué par un bandeau cookies.

## Demande
Sur mobile, le bandeau ne doit plus masquer le haut de l'accueil ni rivaliser avec le bouton principal : une seule ligne compacte (texte court + lien + petit « OK » à droite), ou pas de bandeau du tout puisque le site n'utilise que des cookies nécessaires (pas de consentement requis ; le lien « Cookies » du pied de page suffit à informer).

## Comment vérifier
Sur l'accueil à 375 px, en navigation privée : le titre, le sous-titre, « Tester mon site » et « Voir un exemple de rapport » sont visibles sans défiler, et rien ne les recouvre. Le bouton « OK », s'il reste, est plus discret que « Tester mon site ».

## Détails
Test du 19 nov 2026 avec le skill « visiteurs » (100 visiteurs simulés par IA à partir de vraies captures ordinateur et mobile de l'accueil ; 50 mobile, 50 ordinateur ; 60 cible, 25 proches, 15 hors cible). Résultat global : 76 % comprennent en 5 s, 87 % restent, 68 % trouvent le bouton, 18 % lanceraient un audit, 57 % « peut-être ». Rapport complet : `retours/mehdi/2026-11-19-test-visiteurs/rapport.html`. Visiteurs simulés : à confirmer avec de vrais utilisateurs.
- Capture actuelle : `2026-11-19-test-visiteurs/page-mobile-fold.png`.
- Fichier : `web/app/cookie-notice.tsx` (bouton `max-[480px]:w-full` et texte sur 3 lignes en mobile). Le commentaire du fichier note déjà qu'il s'agit d'une information, pas d'un consentement.

## Réponse de Georges
- Statut : nouveau
