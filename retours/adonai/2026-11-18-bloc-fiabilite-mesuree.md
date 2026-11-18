# Afficher la fiabilité mesurée du score

- Type : nouvelle fonctionnalité
- Priorité : important
- Auteur : adonai
- Date : 2026-11-18

## Constat
Sur https://agentproof-iota-tawny.vercel.app et /methode, consultés le 18 novembre 2026, le site explique que le juge relit la capture, qu'un échec est rejoué et que certains runs sont vérifiés à la main. Mais il n'affiche aucun chiffre sur la fiabilité du score.

Ces chiffres existent déjà dans le README (lignes 108 et 110) :
- accord juge / agent : 114 runs sur 140 vérifiés à l'aveugle (81 %) ;
- répétabilité : même verdict pour 30 missions sur 37 comparables, sur 10 sites joués deux fois (81 %) ;
- vérification manuelle du 17 novembre : 15 runs relus capture et replay, 4 erreurs de l'agent trouvées (2 faux succès, 2 faux échecs), qui ont servi à corriger ses consignes.

Le jury va demander si le score est fiable. Un outil qui mesure sa propre marge d'erreur et l'affiche est plus crédible qu'un outil qui donne un score sans marge.

## Demande
Ajouter un bloc court « Fiabilité mesurée » avec ces 3 chiffres, chacun en une ligne, et la date de mesure. Emplacement proposé : sur /methode, avec un lien depuis l'accueil (ou sous le classement de l'accueil, près de la légende des seuils).

Formulations proposées :
- « 81 % : le juge visuel donne le même verdict que l'agent (114 runs sur 140, vérifiés sans voir l'avis de l'agent). »
- « 81 % : même verdict quand on rejoue un site (30 missions sur 37). C'est pourquoi le classement fait la moyenne de 2 passages. »
- « 15 runs relus à la main : les 4 erreurs de l'agent trouvées ont servi à corriger ses consignes. »

## Comment vérifier
Sur /methode, le bloc « Fiabilité mesurée » affiche les 3 chiffres et leur date. Les chiffres correspondent à ceux du README.

## Détails
- Si les chiffres du README changent d'ici vendredi, reprendre les derniers. Je peux refaire la vérification manuelle sur les nouveaux runs si besoin.
- Mon tableau de vérification : https://claude.ai/artifact/3tmYcUnYKrrXu1a4qqww1g

## Réponse de Georges
- Statut : nouveau
