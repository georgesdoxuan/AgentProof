# Démo : un site proposé par le jury tombe sur une page d'erreur

- Type : modification
- Priorité : important
- Auteur : alexandre
- Date : 2026-11-18

## Constat
PLAN.md (vendredi) prévoit de « lancer un audit sur un site proposé par le jury ». Mais si `ALLOWED_DOMAINS` est réglé pour la démo, tout autre site reçoit en texte brut : « Ce site n'est pas ouvert aux audits pour le moment. » (HTTP 403).
Résultat : une page blanche avec une seule phrase, sans retour possible, devant le jury.

## Demande
Quand un site n'est pas dans la liste, le visiteur reste sur une vraie page qui :
- explique en une phrase pourquoi (démo limitée pour protéger les crédits) ;
- liste les sites ouverts, chacun avec un lien vers son dernier rapport terminé.

Décision d'équipe à prendre aussi : vendredi, liste fermée ou formulaire ouvert ? Le plan et le réglage actuel se contredisent.

## Comment vérifier
Avec `ALLOWED_DOMAINS="jules.com,celio.com"`, saisir `zara.com` sur l'accueil : on voit une page AgentProof avec les sites ouverts et leurs rapports, pas un texte brut.

## Détails
- Message actuel : `web/app/api/audits/route.ts:35`. Les autres erreurs de ce fichier passent aussi par `fail()` en texte brut, alors qu'une redirection vers le formulaire avec `?erreur=…` (comme `/connexion`) serait plus propre.
- Rappel : un site audité depuis moins de 7 jours renvoie déjà au rapport existant (`recentAudit`). C'est l'effet « instantané » à montrer au jury.

## Réponse de Georges
- Statut : fait
- Un site hors de `ALLOWED_DOMAINS` redirige vers `/sites-ouverts?site=…` : une phrase explique la limite (crédits de démo), puis la liste des sites ouverts avec leur score et un lien vers leur dernier rapport public terminé (audits du benchmark uniquement, jamais ceux d'une équipe).
- Les autres erreurs de la route restent en texte brut. La décision « liste fermée ou formulaire ouvert vendredi » reste à prendre en équipe.
- Fichiers : `web/app/api/audits/route.ts`, `web/app/sites-ouverts/page.tsx`.
- Commit : fa425bf.
