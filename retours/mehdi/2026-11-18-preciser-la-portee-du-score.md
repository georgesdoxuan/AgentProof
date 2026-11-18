# Afficher la portée du test près du score

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
Sur le rapport Celio, le libellé « Prêt pour les agents » accompagne un score de 100 %. La limite du test, jusqu'à la première page du checkout sans paiement ni données personnelles, apparaît surtout en pied de page. Le score peut être compris comme une validation plus large que les missions réalisées.

## Demande
Afficher près du score une phrase décrivant la couverture réelle : nombre de missions comptées, appareil et arrêt à l'entrée du checkout. Indiquer clairement « Paiement non testé ». Utiliser les données réelles du rapport, sans nombre codé en dur.

## Comment vérifier
Sur le rapport Celio, on comprend près du score que cinq parcours sur ordinateur ont été comptés et que le paiement n'a pas été testé. Sur un rapport mobile ou comportant des missions exclues, le texte reflète la couverture réelle et distingue les missions exclues.

## Détails
Objectif : expliquer au jury ce que mesure le score. Effort estimé : une à deux heures. Composant : web/app/audit/[id]/page.tsx. La limite existe déjà dans le pied de page : la demande consiste à la rapprocher du résultat.

## Réponse de Georges
- Statut : fait
- Sous le score (page et couverture PDF), une phrase tirée des données du rapport : nombre de parcours comptés, appareil, « de l'accueil jusqu'à l'entrée du checkout », missions exclues avec leurs raisons, missions non vérifiées ou non jouées, puis « Paiement non testé » (ou « Paiement testé à part » quand un test de paiement est lié). Aucun nombre codé en dur (`scopeText` dans `web/app/audit/[id]/page.tsx`).
- Celio : « Score calculé sur 5 parcours sur ordinateur, de l'accueil jusqu'à l'entrée du checkout. Paiement non testé. »
