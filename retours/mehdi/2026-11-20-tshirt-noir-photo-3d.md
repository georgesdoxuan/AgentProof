# T-shirt noir photographique en rotation continue

- Type : modification
- Priorité : bonus
- Auteur : mehdi
- Date : 2026-11-20

## Constat
Mehdi a remplacé la référence du vêtement : il souhaite maintenant le t-shirt noir de sa capture du 20 novembre à 10:07:36. Il accepte un dos approximatif, souhaite une rotation automatique continue et un bas moins rigide. Le prototype précédent du pull noir ne constitue plus la référence visuelle souhaitée.

## Demande
Utiliser le fichier voisin `tshirt-noir-photo-3d.html` comme référence d'intégration du vêtement dans la démonstration MAISON. Le devant utilise la photographie intégrée au fichier pour conserver son imprimé. Le dos est noir et reconstitué. La rotation démarre au chargement et reprend après un glissement. Un bouton Pause reste disponible.

## Comment vérifier
- Ouvrir le fichier dans un navigateur avec Internet et WebGL ; la rotation commence sans clic.
- Le bouton « Voir le devant » ramène la face photographique, puis la rotation continue.
- Le glissement permet de tourner manuellement ; relâcher reprend la rotation si elle n'a pas été mise en pause.
- Pause arrête le mouvement ; « Lancer la rotation » le reprend.
- La transition d'épaisseur sous les manches est progressive, le bas est ouvert et l'ourlet légèrement irrégulier.
- Les tailles restent illustratives ; aucune commande n'est effectuée.
- Préserver les interactions et le bandeau cookies du scénario de démonstration existant lors de l'intégration.

## Détails
Ce fichier remplace visuellement la référence `maison-pull-3d.html` déposée précédemment. Ne pas supprimer ni modifier les réponses de Georges des demandes précédentes.

Le prototype est autonome : photographie embarquée, Three.js 0.170.0 depuis jsDelivr, géométrie procédurale avec texture photographique au devant. Il ne s'agit pas d'un scan 3D exact. Le dos, l'épaisseur et les plis sont approximatifs. Le prix de 24,99 € est explicitement indiqué comme prix de démonstration à confirmer pour ce nouveau modèle : il provenait de l'ancienne référence ASOS.

La syntaxe JavaScript est vérifiée. Le rendu final et les performances en production restent à vérifier. Pour une intégration React, prévoir le chargement côté client, le nettoyage des textures, géométries, matériaux, renderer, écouteurs et ResizeObserver, ainsi qu'un visuel de secours et un contrôle des animations accessible. Ne pas remplacer toute la démonstration par ce fichier autonome.

Aucun code applicatif n'est modifié dans ce dépôt : l'intégration revient à Georges.

## Réponse de Georges
- Statut : nouveau
