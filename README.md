# AgentProof

**On envoie un client mystère IA sur ton site e-commerce.**

Un agent IA computer-use (H Company, Holo) essaie d'acheter sur ton site comme un vrai client : il cherche, filtre, choisit une taille et va jusqu'à la première page du checkout, sans payer. Tu reçois un score, la capture du moment exact où l'agent bloque, le replay de chaque session, la comparaison avec un concurrent et un plan de corrections.

- **Prototype en ligne : https://agentproof-iota-tawny.vercel.app**
- Classement public : https://agentproof-iota-tawny.vercel.app/classement
- Dataset : https://huggingface.co/datasets/georgesdoxuan/agentproof-runs

Hackathon H Company × Hugging Face 2026 · Équipe 6 : Thomas (CEO), Georges (CPO / CTO), Alexandre (CAIO), Mehdi (CAO), Adonaï (CDO).
Contexte complet : [CONTEXT.md](CONTEXT.md) · Plan d'action : [PLAN.md](PLAN.md)

## Problème

63 % des responsables e-commerce disent que leur tunnel d'achat ne peut pas être finalisé par un agent IA (Blend Commerce, 2026). Les outils existants lisent le code du site. Personne ne teste en vrai.

## Solution

1. **Missions** : 10 parcours d'achat réalistes (recherche, menu, filtre prix, variante, promo, panier…).
2. **Score** : part des missions où l'agent atteint le checkout.
3. **Preuves** : dernière capture de l'agent + replay public de la session H.
4. **Juge visuel** : un modèle de vision Hugging Face vérifie la capture, pour ne pas croire l'agent sur parole.
5. **Corrections** : blocages classés par impact et plan de corrections écrit par un LLM.

## Architecture

```
Navigateur ──> Next.js (Vercel) ──lit/écrit──> Supabase (Postgres + Storage captures)
                   ▲    │
   n8n (VPS) ──────┘    │  /api/tick chaque minute : lance et récupère les sessions (≤ 5 requêtes H/min)
   └─ Telegram          ├──> H Company Agents API : agent « agentproof-shopper » (holo4-35b-a3b, navigateur cloud)
      (audit terminé)   └──> Hugging Face Inference Providers : juge visuel + plan de corrections (Qwen3.5-9B)
```

| Brique | Fichier |
|---|---|
| Config de l'agent H (consignes, règles, schéma de réponse) | [agent/agent.json](agent/agent.json) |
| Moteur : création d'audit, tick, juge, corrections, replay | [web/lib/engine.ts](web/lib/engine.ts) |
| Routes API (audits, tick) | [web/app/api](web/app/api) |
| Replay étape par étape | [web/app/replay/[run]/page.tsx](web/app/replay/[run]/page.tsx) |
| Pages (accueil, classement, rapport) | [web/app](web/app) |
| Export du dataset Hugging Face | [scripts/export-hf.sh](scripts/export-hf.sh) |
| Workflow n8n « AgentProof — moteur et notifications » | sur l'instance n8n de l'équipe |

### Pourquoi un tick et pas des webhooks

Les clés H du plan Free sont limitées à 5 requêtes par minute et 3 sessions en parallèle. Un seul point d'entrée (`/api/tick`, appelé chaque minute par n8n) dépense ce budget : 1 requête pour vérifier une session (ses derniers événements contiennent la réponse, les tokens, le coût et la dernière capture), 1 pour télécharger la capture, 1 pour lancer une session. Les replays sont créés à la demande (1 requête par run, une seule fois) : la trajectoire partagée et ses captures sont ensuite publiques, sans clé ni limite.

## Comment tester

1. Ouvrir https://agentproof-iota-tawny.vercel.app, saisir un site e-commerce (et un concurrent si on veut), lancer l'audit.
2. La page du rapport se met à jour toute seule : missions en cours, puis score, blocages, captures, replays et plan de corrections (compter 10 à 20 minutes pour 5 missions).
3. Le classement compare les sites mode déjà audités.

En local :

```bash
cd web && cp ../.env.example .env.local   # puis remplir les clés
npm install && npm run dev
curl localhost:3000/api/tick -H "x-tick-secret: $TICK_SECRET"   # fait avancer les audits
```

## Résultats

Premiers runs (17 nov) : sur Celio, l'agent va jusqu'au checkout en 7 à 13 étapes, 40 à 70 s, **0,01 à 0,02 $ par mission** avec `holo4-35b-a3b`. Un audit de 10 missions coûte environ 0,20 $.
Benchmark 10 sites × 5 missions : voir le classement en ligne et le dataset.

## Limites et suite

- Une seule mission échoue parfois à cause de l'agent et pas du site : le juge visuel limite les faux succès, pas les faux échecs. Vérification manuelle d'un échantillon à faire.
- Navigateur cloud depuis une IP de datacenter : certains sites anti-bot bloquent, comme ils bloqueraient un vrai agent.
- Mobile = taille d'écran mobile, sans user-agent mobile.
- À venir : e-mail du rapport, suivi mensuel avec alerte, plusieurs agents (ChatGPT agent…), comptes de test fournis par le marchand.

## Retours sur l'Agent API de H

| Date | Ce qui a marché / cassé / surpris |
|---|---|
| 17 nov | Création d'agent par API et `answer_format` : simple, la réponse structurée arrive bien typée. |
| 17 nov | Les événements d'une session contiennent tout (réponse, tokens, coût en $, URL et capture de chaque étape) : un seul appel suffit pour finaliser un run. |
| 17 nov | La console affiche « services indisponibles » alors que l'API répond normalement. |
| 17 nov | La limite Free de 5 requêtes/min par clé impose un ordonnanceur ; pas documentée dans « Plans and limits », seulement sur la page des clés. |
| 17 nov | La ressource `screenshots/step-N.png` de la doc renvoie 404 ; l'URL de capture se trouve dans les événements d'observation. |
