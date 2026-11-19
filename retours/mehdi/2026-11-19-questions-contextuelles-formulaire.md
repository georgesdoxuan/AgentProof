# Répondre aux objections près du formulaire

- Type : modification
- Priorité : bonus
- Auteur : mehdi
- Date : 2026-11-19

## Constat
La FAQ et les pages de méthode/confidentialité existent. Le formulaire indique la durée et les étapes, mais le visiteur doit chercher ailleurs des précisions sur la visibilité des rapports et les limites du verdict. Cette demande ne suppose pas que ces réponses sont absentes du site.

## Demande
Ajouter près du formulaire deux ou trois réponses courtes et repliables, reliées à la FAQ existante : qui peut voir le rapport, ce que l’audit vérifie et ce qu’un échec signifie. Réutiliser les règles réelles et une source de texte commune ; ne pas alourdir le parcours.

## Comment vérifier
Sur ordinateur et à 390 px, les réponses sont accessibles au clavier et cohérentes avec la FAQ et les permissions réelles. La présentation ne promet pas un rapport privé si son lien suffit à le consulter. Le bouton de lancement reste facile à trouver.

## Détails
2026-11-19 — Proposition validée par Mehdi après comparaison des pages publiques Apple et AgentProof. Reprendre des principes de clarté du parcours, pas copier le site Apple. Effort estimé : une à deux heures après vérification des droits d’accès. Ne pas dupliquer les demandes existantes sur gratuité et sécurité du haut de page. Aucun changement des permissions ni envoi d’e-mail.

## Réponse de Georges
- Statut : fait. Sous le formulaire de l'accueil, « Avant de lancer » : trois questions repliables (qui peut voir mon rapport, que vérifie l'audit, que veut dire une mission bloquée), chacune avec un lien vers la même question dans /faq. Texte unique dans lib/faq.ts (FORM_FAQ), aussi trouvable dans la recherche de l'aide. Les réponses suivent les droits réels : le lien du rapport suffit pour l'ouvrir sans connexion (on ne promet pas un rapport privé), les audits d'équipe n'entrent pas dans le classement (vue site_scores : team_id is null), le test de paiement n'est visible que par l'équipe. Le bouton « Lancer l'audit » reste au-dessus. Permissions inchangées. PR #68.
