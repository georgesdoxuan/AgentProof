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
3. **Preuves** : dernière capture de l'agent + replay étape par étape (écran, action, point cliqué, raisonnement).
4. **Juge visuel à l'aveugle** : un modèle de vision Hugging Face regarde la dernière capture et la mission, sans connaître l'avis de l'agent. Si le juge ne répond pas, le run est « non vérifié » et sort du score.
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

## Résultats (benchmark du 17 nov 2026)

10 sites mode français × 5 missions, agent `holo4-35b-a3b`, ordinateur. **36 missions réussies sur 52 (69 %)**, environ 90 s et 19 étapes par mission, **1,68 $ au total** (0,03 $ par mission en moyenne).

| Site | Réussies | Blocages relevés |
|---|---|---|
| Asphalte | 5/5 | — |
| Jules | 5/5 | — |
| Celio | 6/7 | compte obligatoire |
| Bonobo | 3/5 | sélecteur de taille, compte obligatoire |
| Sézane | 3/5 | autre |
| Balibaris | 3/5 | rupture de stock, autre |
| Le Slip Français | 3/5 | autre |
| Promod | 3/5 | bouton qui ne réagit pas, autre |
| Etam | 2/5 | compte obligatoire, autre |
| Kiabi | 0/5 | captcha / anti-bot, autre |

Détail mission par mission, captures et replays : classement en ligne et dataset Hugging Face.

## Test de paiement réel (équipe)

R&D interne, hors produit : page `/test-paiement`, réservée aux comptes de l'équipe AgentProof (`STAFF_EMAILS`). L'agent achète l'article le moins cher et paie **une seule fois** avec une carte virtuelle Revolut de l'équipe, sur un compte à 0 €. Un refus « fonds insuffisants » prouve que le paiement a atteint la banque (il serait passé avec des fonds). Le 3D Secure est validé par un humain sur son téléphone. Verdicts : paiement transmis à la banque, bloqué au 3D Secure, formulaire de carte inutilisable, paiement jamais atteint, compte obligatoire, anti-bot, erreur.

- La carte est saisie par l'équipe dans les variables Vercel (`TEST_CARD_*`, `TEST_EMAIL`), jamais dans le repo.
- Les captures de ces runs ne sont jamais stockées ni partagées (elles peuvent montrer la carte) ; le juge visuel les lit en mémoire.
- Règle : 1 à 2 tentatives par site au maximum, jamais de faux numéro de carte.
- Prochaine étape : cartes émises par nous (Stripe Issuing, Adyen, Swan) avec autorisation refusée en temps réel, pour automatiser la preuve bancaire.

## Fiabilité et sobriété

- **Accord juge / agent** : sur 140 runs vérifiés à l'aveugle (capture + URL de la page, jamais l'avis de l'agent), le juge donne le même verdict que l'agent dans 114 cas (81 %). Les écarts sont surtout des pages panier que l'agent croyait être le checkout. Accord juge / humain : vérification manuelle à faire.
- **Score honnête** : seuls les runs vérifiés comptent. Rupture de stock, blocage anti-bot (IP de datacenter), mission impossible sur le catalogue (ex. un site de porte-clés) et agent à court d'étapes sont affichés à part, hors score.
- **Répétabilité** : 10 sites joués deux fois, même verdict pour 30 missions sur 37 comparables (81 %). Le classement public fait donc la moyenne des 2 derniers passages de chaque site.
- **Sobriété** : le moteur interroge le quota H et ne lance plus rien quand il reste moins de 10 M de tokens gratuits (`TOKEN_RESERVE`) ; un site bloqué par l'anti-bot n'use qu'une mission ; un site audité depuis moins de 7 jours renvoie au rapport existant.
- **Robustesse** : une requête liste l'état de toutes les sessions ; un run en erreur ne bloque plus la file ; chaque run est réservé avant lancement (pas de doublon) ; chaque audit n'est clôturé et notifié qu'une fois.
- **Formulaire protégé** : domaines publics uniquement, 6 audits par heure et par connexion, liste de domaines autorisés pour la démo (`ALLOWED_DOMAINS`), `FORM_MISSIONS=3` le jour de la démo.

## Automations (surveillance quotidienne)

Espace › Automations : l'équipe colle une ou plusieurs URL. Une fois par jour, le tick lit chaque page via Jina Reader (rendu dans un vrai navigateur, passe les 403 anti-bot) et en garde la structure, sans IA : titre, domaines des scripts tiers, iframes, formulaires, champs, libellés des boutons. Prix, produits et chiffres sont ignorés. Si la liste diffère de la veille, l'équipe est prévenue (section + e-mail au créateur) et, en mode « Prévenir et auditer », un audit repart tout seul. Lecture stable vérifiée : 3 lectures identiques de suite sur jules.com, celio.com, allbirds.com. Une page anti-bot (moins de 5 éléments) n'est jamais prise comme référence. Tables `automations` et `automation_checks`. `JINA_API_KEY` facultative (gratuit : 20 pages par minute).

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
