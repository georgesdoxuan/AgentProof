# Ajouter une courte FAQ sur l'éthique et les données

- Type : nouvelle fonctionnalité
- Priorité : important
- Auteur : adonai
- Date : 2026-11-18

## Constat
Sur https://agentproof-iota-tawny.vercel.app, consulté le 18 novembre 2026, il n'y a pas de FAQ. Les réponses aux questions éthiques sont dispersées entre le pied de page, /methode et /confidentialite. Un marchand ou un membre du jury qui se pose la question ne trouve pas la réponse là où il la cherche.

Ce sont aussi les questions que le jury posera vendredi pendant le Q&A.

## Demande
Ajouter une FAQ de 5 questions, avec des réponses de 2 phrases au plus, en bas de l'accueil ou sur /methode. Chaque réponse peut renvoyer vers la page qui détaille (/methode ou /confidentialite).

Texte proposé :

1. **Est-ce légal de tester un site sans son accord ?**
   L'agent visite des pages publiques comme un client : sans compte, sans paiement et sans contourner de protection. Si un site le bloque, la mission est notée « bloquée par protection » et sort du score.
2. **Quelles données collectez-vous ?**
   L'e-mail de ton compte et du rapport, et l'adresse du site testé. L'agent ne saisit aucune donnée personnelle sur les sites ; le détail est sur /confidentialite.
3. **L'agent paie-t-il ?**
   Jamais pendant un audit : il s'arrête à la première page du checkout. Le paiement n'est donc pas testé.
4. **Le score est-il fiable ?**
   Un juge visuel relit chaque succès, chaque échec est rejoué, et le classement fait la moyenne de 2 passages. Les erreurs de l'agent sont exclues du score ; la marge d'erreur mesurée est sur /methode.
5. **Mon site est dans le classement : je peux contester ?**
   Oui : écris à l'adresse de contact avec le lien du rapport. On vérifie la capture et le replay à la main, puis on corrige ou on relance la mission.

## Comment vérifier
La FAQ s'affiche avec les 5 questions. Chaque réponse correspond à ce que dit /methode et /confidentialite, sans contradiction.

## Détails
- Question 4 : elle renvoie au bloc « Fiabilité mesurée » demandé dans `2026-11-18-bloc-fiabilite-mesuree.md`.
- Question 5 : elle reprend le texte déjà présent sur /methode (ligne 181 de `web/app/methode/page.tsx`).
- Un `<details>` par question suffit, sans JavaScript.

## Réponse de Georges
- Statut : nouveau
