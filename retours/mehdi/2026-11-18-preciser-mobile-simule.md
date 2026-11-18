# Préciser le mode téléphone simulé dans le formulaire

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
Le formulaire affiche « Mobile ». La page https://agentproof-iota-tawny.vercel.app/methode précise que le mode utilise une taille d’écran de téléphone sans navigateur mobile. Cette limite n’est pas expliquée au moment du choix de l’appareil.

## Demande
Ajouter près de l’option Mobile une précision courte : « Format téléphone simulé », et expliquer qu’il ne s’agit pas d’un test sur un smartphone réel. Garder le même périmètre dans le rapport et la méthode.

## Comment vérifier
Avant de lancer un audit, on comprend la différence entre format téléphone et appareil mobile réel. Le choix reste utilisable sur petit écran et au clavier, sans changer les dimensions ou le navigateur effectivement employés. Vérifier les langues disponibles.

## Détails
2026-11-18 — Proposition validée par Mehdi pour transmission à Georges avant la démonstration de vendredi 11 h. Formulaire d’audit dans web/app/page.tsx ou composant associé ; libellés du rapport et traductions si concernés. Effort estimé : une heure. Il s’agit d’une précision de l’interface, pas d’un nouveau moteur mobile.

## Réponse de Georges
- Statut : nouveau
