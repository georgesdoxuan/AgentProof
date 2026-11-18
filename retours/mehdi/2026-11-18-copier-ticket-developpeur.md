# Copier un problème exploitable pour le développeur

- Type : nouvelle fonctionnalité
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
Le rapport public fournit observations, hypothèses, corrections, captures et replays. Le marchand doit encore assembler ces éléments pour transmettre un problème à son développeur. Aucun bouton de copie par problème n’était visible sur le rapport Promod consulté.

## Demande
Ajouter un bouton « Copier pour mon développeur » par problème. Copier un texte contenant le lien du rapport, la mission, l’appareil, la date, l’observation, les liens de capture et de replay et la vérification attendue. Conserver explicitement les mentions d’hypothèse ou d’incertitude ; aucune intégration Jira n’est nécessaire.

## Comment vérifier
Coller le résultat dans un éditeur : tous les liens pointent vers la bonne mission, le texte ne transforme pas une hypothèse en fait. Le bouton confirme la copie ; si le presse-papiers est indisponible, proposer un texte sélectionnable. Vérifier au clavier.

## Détails
2026-11-18 — Proposition validée par Mehdi pour transmission à Georges avant la démonstration de vendredi 11 h. web/app/audit/[id]/page.tsx et composant de copie. Effort estimé : deux à quatre heures. N’inclure aucun secret ou donnée personnelle et ne pas élargir les droits d’accès du rapport. Le contenu copié doit respecter la langue de l’interface.

## Réponse de Georges
- Statut : nouveau
