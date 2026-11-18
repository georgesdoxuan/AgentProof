# L'URL saisie sur l'accueil est perdue après la connexion

- Type : bug
- Priorité : bloquant
- Auteur : alexandre
- Date : 2026-11-18

## Constat
Un visiteur non connecté remplit le formulaire de l'accueil (`/#tester`) : site, concurrent éventuel, ordinateur ou mobile. Il clique « Lancer l'audit ».
`POST /api/audits` le redirige vers `/connexion?next=/espace`. Après avoir cliqué le lien reçu par e-mail, il arrive sur `/espace`.
Résultat : le site saisi a disparu, aucun audit n'est lancé, il doit tout ressaisir dans Espace › Nouveau.
C'est exactement le parcours d'un juré qui teste le prototype par lui-même vendredi.

## Demande
Après la connexion, le visiteur retrouve le formulaire déjà rempli avec ce qu'il avait saisi (site, concurrent, appareil) et n'a plus qu'à cliquer pour lancer l'audit.

## Comment vérifier
1. Se déconnecter, ouvrir l'accueil, saisir `jules.com`, cliquer « Lancer l'audit ».
2. Se connecter avec le lien reçu par e-mail.
3. On arrive sur un formulaire pré-rempli avec `jules.com` (ou directement sur le rapport) et pas sur un `/espace` vide.

## Détails
- Redirection en cause : `web/app/api/audits/route.ts:15` (`/connexion?next=/espace`).
- Idée : rediriger vers `/connexion?next=/espace/nouveau?url=…&competitor=…&device=…` et pré-remplir `web/app/espace/nouveau/page.tsx` depuis les paramètres de l'URL. Ne jamais lancer l'audit tout seul, pour ne pas dépenser de crédits H sans clic.
- Vérifier que `next` passe bien le lien magique (`web/app/api/auth/route.ts`), encodage compris.

## Réponse de Georges
- Statut : nouveau
