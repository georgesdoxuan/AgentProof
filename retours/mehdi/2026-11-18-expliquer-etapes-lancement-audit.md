# Expliquer les étapes avant le lancement d’un audit

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
Le formulaire propose « Lancer l’audit » et mentionne ensuite une connexion par e-mail. L’utilisateur peut hésiter sur ce qui se passe après le clic. Observation de l’interface uniquement : le formulaire n’a pas été soumis pendant cette revue.

## Demande
Expliquer près du bouton le parcours réel : connexion si nécessaire, lancement, ouverture du rapport progressif et notification si activée. Vérifier le comportement connecté et non connecté avant de rédiger le texte.

## Comment vérifier
Sans lancer de mission payante pendant la vérification éditoriale, contrôler le parcours en environnement de test : les étapes annoncées correspondent aux écrans et aux états réels. Ne pas annoncer un envoi garanti si la configuration d’envoi manque.

## Détails
2026-11-18 — Demande validée par Mehdi pour la démonstration de vendredi à 11 h. Effort estimé : une à deux heures après vérification du parcours. web/app/page.tsx et composants du formulaire et de connexion. Aucun changement de mécanisme d’authentification demandé.

## Réponse de Georges
- Statut : fait
- Encadré « Après le clic » sous le bouton, tiré du code : 1) si non connecté, lien par e-mail puis retour sur le formulaire rempli (nouveau comportement) ; 2) si l'équipe a audité ce site sur le même appareil ces 7 derniers jours, ouverture de ce rapport sans nouvel audit ; 3) sinon, cinq missions, rapport ouvert tout de suite et rempli au fil de l'audit ; 4) envoi par e-mail à la fin, annoncé seulement si `N8N_NOTIFY_URL` est configuré.
- Vérifié en local sans lancer d'audit : redirection non connecté et `next` transmis à la page de connexion.
- Fichier : `web/app/page.tsx`.
- Commit : fa425bf.
