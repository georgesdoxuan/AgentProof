# Afficher l'accord juge / humain, le chiffre qui manque pour le jury

- Type : nouvelle fonctionnalité
- Priorité : important
- Auteur : alexandre
- Date : 2026-11-18

## Constat
Le README et la page `/methode` donnent seulement l'accord juge / agent (81 % sur 140 runs). L'accord juge / humain est noté « vérification manuelle à faire ».
Or la première question d'un jury sceptique sera « votre juge IA a-t-il raison ? ». Un accord entre deux IA ne prouve pas qu'elles ont raison.

## Demande
1. Je calcule l'accord juge / humain à partir du tableau de vérification manuelle d'Adonaï (runs vérifiés, nombre d'accords, faux succès, faux échecs). Je dépose le résultat dans ce dossier d'ici jeudi midi.
2. Georges l'affiche sur `/methode` et dans la section « Fiabilité » du README, à côté de l'accord juge / agent, avec la taille de l'échantillon (ex. « 27 / 30 runs, 90 % »).

## Comment vérifier
Sur `/methode` et dans le README, on lit l'accord juge / humain chiffré, avec le nombre de runs vérifiés à la main.

## Détails
- Page concernée : `web/app/methode/page.tsx`. README, section « Fiabilité et sobriété ».
- Si l'échantillon est petit (moins de 30 runs), l'écrire tel quel : le jury préfère un chiffre honnête et petit à une promesse.
- Ce chiffre sert aussi au deck de Thomas (slide fiabilité).

## Réponse de Georges
- Statut : nouveau
