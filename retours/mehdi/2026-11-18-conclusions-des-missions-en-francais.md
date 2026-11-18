# Harmoniser les conclusions affichées en français

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
Le rapport Celio mélange des conclusions en anglais, par exemple « Reached the first checkout page », et des conclusions en français. Le reste de l'interface est en français.

## Demande
Afficher les conclusions des missions en français, avec une formulation fidèle au résultat. Conserver la réponse originale accessible dans les détails pour la traçabilité. Éviter un appel IA supplémentaire par mission si une formulation à partir des résultats structurés suffit.

## Comment vérifier
Sur un rapport contenant des réponses agent françaises et anglaises, les conclusions principales sont toutes lisibles en français. Les détails permettent de retrouver le texte original. Le verdict, la preuve et les réserves ne changent pas lors de la reformulation.

## Détails
Objectif : rendre la démo plus lisible pour le jury. Effort estimé : deux à quatre heures. Composants : présentation des missions dans web/app/audit/[id]/page.tsx et résultat structuré produit par web/lib/engine.ts. Ne pas inventer de cause lors de la reformulation.

## Réponse de Georges
- Statut : fait
- La conclusion de chaque mission est construite en français à partir du verdict, sans appel IA : « Entrée du checkout atteinte » (avec « page de connexion ou d'inscription » quand l'URL finale ou le juge le montrent), « L'agent n'atteint pas l'entrée du checkout » (le libellé du blocage reste affiché au-dessus), ou « Résultat non vérifié par le juge visuel ». Aucune cause n'est inventée.
- La réponse originale de l'agent (détail et résumé des étapes) reste accessible dans « Réponse originale de l'agent », repliée sous la conclusion. Verdict, capture et replay inchangés (`conclusion` dans `web/app/audit/[id]/page.tsx`).
