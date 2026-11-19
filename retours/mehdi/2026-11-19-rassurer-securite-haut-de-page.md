# Rassurer dès le haut de page : aucun achat, aucune donnée

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-19

## Constat
11 visiteurs, surtout des profils techniques (CTO, directeur digital), craignent que l'agent passe une vraie commande, pollue les statistiques ou touche au site en production : « Je ne vais pas faire entrer un agent externe sur notre site sans validation sécurité. » La garantie existe, mais seulement en petit sous le formulaire (« l'agent ne paie jamais et ne saisit aucune donnée personnelle »).

## Demande
Afficher près des boutons du haut de l'accueil les garanties qui sont déjà vraies (CONTEXT.md § 7) : « Aucun paiement », « Aucune donnée personnelle saisie », « Arrêt à l'entrée du checkout », avec un lien vers /methode. N'ajouter aucune garantie qui ne serait pas tenue par le code.

## Comment vérifier
Sur l'accueil, ordinateur et mobile, les garanties sont visibles sans défiler ou juste après le premier écran, et le lien mène à /methode.

## Détails
Test du 19 nov 2026 avec le skill « visiteurs » (100 visiteurs simulés par IA à partir de vraies captures ordinateur et mobile de l'accueil ; 50 mobile, 50 ordinateur ; 60 cible, 25 proches, 15 hors cible). Résultat global : 76 % comprennent en 5 s, 87 % restent, 68 % trouvent le bouton, 18 % lanceraient un audit, 57 % « peut-être ». Rapport complet : `retours/mehdi/2026-11-19-test-visiteurs/rapport.html`. Visiteurs simulés : à confirmer avec de vrais utilisateurs.
- Peut se combiner avec `2026-11-19-gratuit-sous-le-bouton.md` sur une même ligne si la place manque.
- Fichier : `web/app/(accueil)/page.tsx`.

## Réponse de Georges
- Statut : nouveau
