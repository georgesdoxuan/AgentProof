# Ajouter une section « L'équipe »

- Type : nouvelle fonctionnalité
- Priorité : bonus
- Auteur : adonai
- Date : 2026-11-18

## Constat
Sur https://agentproof-iota-tawny.vercel.app, consulté le 18 novembre 2026, le site ne dit pas qui a construit AgentProof : il ne cite que H Company et Hugging Face dans le pied de page. Le jury et les marchands ne voient pas l'équipe derrière le produit.

## Demande
Ajouter une petite section « L'équipe », en bas de l'accueil ou sur /methode : une ligne par membre, avec le prénom et le rôle. Pas de nom de famille ni de photo, pour limiter les données personnelles publiées.

Texte proposé (rôles de PLAN.md) :
- Thomas, CEO : projet, business et pitch
- Georges, CPO et CTO : produit, application et architecture
- Alexandre, CAIO : agent IA, juge visuel et corrections
- Mehdi, CAO : automatisations n8n (e-mails, suivi, alertes)
- Adonaï, CDO : données, métriques, éthique et conformité

## Comment vérifier
La section affiche les 5 prénoms et leurs rôles, sans nom de famille ni photo.

## Détails
- Demander l'accord de chaque membre avant de publier son prénom (je m'en occupe à la synchro).
- Une ligne « Projet étudiant, Eugenia School, hackathon H Company × Hugging Face » peut accompagner la section, comme dans `web/lib/legal.ts`.

## Réponse de Georges
- Statut : nouveau
