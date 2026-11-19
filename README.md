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

Les clés H du plan Free sont limitées à 3 sessions en parallèle. La page des clés annonçait aussi 5 requêtes par minute, mais l'API répond `x-ratelimit-limit: 40000` et aucune rafale n'a reçu de 429 (mesuré le 18 nov). Un seul point d'entrée (`/api/tick`, appelé chaque minute par n8n) parle à H : pendant 45 s, il fait une passe toutes les 10 s, récupère les sessions finies (1 requête pour les événements, 1 pour la capture, le juge de chaque session en parallèle) et remplit aussitôt les places libres (1 requête par lancement). Un audit lance sa première passe dès sa création, sans attendre le cron. Une mission échouée est rejouée dès son échec, pendant que les autres tournent. Les replays sont créés à la demande (1 requête par run, une seule fois) : la trajectoire partagée et ses captures sont ensuite publiques, sans clé ni limite.

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

## Benchmark mobile (18 nov 2026)

5 sites du classement × 5 missions, écran de téléphone (390×844), même agent. **13 missions réussies sur 23 comptées (57 %)**, contre 45 sur 47 (96 %) sur ordinateur pour les mêmes sites. Environ 105 s par mission, 1,43 $ au total.

| Site | Mobile | Ordinateur (classement) | Blocages relevés sur mobile |
|---|---|---|---|
| Jules | 5/5 | 9/9 | — |
| Asphalte | 3/4 | 10/10 | bouton qui ne réagit pas |
| Celio | 2/5 | 10/10 | compte obligatoire (3) |
| Promod | 2/5 | 7/9 | sélecteur de taille (2), bandeau cookies |
| Sézane | 1/4 | 9/9 | compte obligatoire (2), bouton qui ne réagit pas |

Les sites « prêts pour les agents » sur ordinateur bloquent bien plus sur mobile. À vérifier à la main : les blocages « compte obligatoire » de Celio et Sézane, qui ne sortent pas sur ordinateur.

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
- **Échec confirmé** : chaque mission ratée est rejouée une fois avant la clôture de l'audit ; le second essai fait foi (sauf anti-bot, rupture, compte obligatoire, mission impossible, qu'un nouvel essai ne changerait pas). Le premier essai reste visible dans le rapport, et le coût affiché inclut les deux.
- **Sobriété** : le moteur interroge le quota H et ne lance plus rien quand il reste moins de 10 M de tokens gratuits (`TOKEN_RESERVE`) ; un site bloqué par l'anti-bot n'use qu'une mission ; un site audité depuis moins de 7 jours renvoie au rapport existant.
- **Robustesse** : une requête liste l'état de toutes les sessions ; un run en erreur ne bloque plus la file ; chaque run est réservé avant lancement (pas de doublon) ; chaque audit n'est clôturé et notifié qu'une fois.
- **Formulaire protégé** : domaines publics uniquement, 6 audits par heure et par connexion, liste de domaines autorisés pour la démo (`ALLOWED_DOMAINS`), `FORM_MISSIONS=3` le jour de la démo.

## Automations (surveillance quotidienne)

Espace › Automations : l'équipe colle une ou plusieurs URL. Une fois par jour, le tick lit chaque page via Jina Reader (rendu dans un vrai navigateur, passe les 403 anti-bot) et en garde la structure, sans IA : titre, domaines des scripts tiers, iframes, formulaires, champs, libellés des boutons. Prix, produits et chiffres sont ignorés. Si la liste diffère de la veille, l'équipe est prévenue (section + e-mail au créateur) et, en mode « Prévenir et auditer », un audit repart tout seul. Lecture stable vérifiée : 3 lectures identiques de suite sur jules.com, celio.com, allbirds.com. Une page anti-bot (moins de 5 éléments) n'est jamais prise comme référence. Tables `automations` et `automation_checks`. `JINA_API_KEY` facultative (gratuit : 20 pages par minute).

Depuis le 19 novembre :
- **Fréquence par page** : toutes les heures, 6 h, une fois par jour (défaut) ou par semaine (`automations.interval_hours`). Une vérification par tick tant qu'il reste 40 s.
- **Contrôle statique suivi** : chaque vérification ajoute à la signature les lignes du contrôle statique (robots.txt, anti-bot, schema.org, UCP, ACP, WebMCP, llms.txt). Un robots.txt qui se ferme aux agents ou un profil UCP qui disparaît compte comme un changement. Les anciennes références adoptent ces lignes sans alerte.
- **Webhook d'équipe** (`teams.webhook_url`) : chaque changement et chaque baisse de score part aussi sur Slack (`{text}`), Discord (`{content}`) ou une URL https quelconque (JSON `{source, event, domain, text, link}`).
- **Seuil de baisse de score** par équipe : 5, 10 (défaut) ou 20 points (`teams.score_drop`).
- **Mise en ligne** : `POST /api/hooks/<teams.hook_token>` (Vercel `deployment.succeeded`, Shopify `themes/publish`, GitHub `deployment_status`, ou `curl`) fait vérifier toutes les pages de l'équipe dans la minute. Un seul déclenchement par 2 minutes.
- **Budget** : au plus un audit automatique par page et par 24 h ; les missions des audits automatiques (`runs.priority = 1`) partent après celles lancées à la main. `AUTOMATIONS_PAUSED=1` (variable Vercel) suspend veille et audits mensuels, par exemple pendant une démo.

## Pour les marchands et les agences

- **Suivi mensuel** (offre à 149 €/mois) : dans Espace › Automations, « Audit tous les 30 jours » relance un audit complet chaque mois. À la clôture de chaque audit d'équipe, si le score baisse de 10 points ou plus par rapport à l'audit précédent (même site, appareil et modèle), le rapport l'affiche et un e-mail part.
- **Contrôle statique gratuit** : à chaque nouvel audit, le tick lit le site sans agent ni crédit H : robots.txt (GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot…), accès sans navigateur, scripts anti-bot et captcha connus, schema.org (dont SearchAction), catalogue Shopify `products.json` et fiche Product, `llms.txt`, plateforme, protocoles d'achat pour agents (profil UCP `/.well-known/ucp`, manifeste ACP, outils WebMCP), frais de port et politique de retour en schema.org. Le rapport place les deux voies côte à côte : par l'écran (score de l'agent) et par protocole. Affiché à côté des résultats de l'agent, hors score.
- **Badge « Agent-ready »** : `/badge/<id de l'audit>.svg`, avec le code HTML à copier depuis le rapport. Par audit et non par domaine : un rapport d'équipe reste privé tant que l'équipe ne partage pas le lien.
- **Rapport PDF** : bouton « Télécharger en PDF » (impression du navigateur), toujours en clair, sans navigation ni boutons.
- **Modèle de l'agent** : audit rapide (`holo4-35b-a3b`) ou précis (`holo4-27b`), ou les deux côte à côte (réussite, durée, coût par mission).
- **Marque blanche** : Équipe › Marque blanche, le nom et le logo de l'agence remplacent AgentProof sur les rapports de l'équipe (page et PDF). Les pages de replay restent aux couleurs d'AgentProof.
- **Replay du premier essai** : quand une mission a été rejouée, les deux tentatives restent visibles.

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
| 18 nov | Sur Kiabi, Holo envoie en boucle `scroll_web` avec `scroll_element` sous forme de chaîne JSON au lieu d'un objet : jusqu'à 19 appels rejetés (`validation_errors` dans les `policy_event`) sur 30 étapes, et la mission échoue. Le moteur classe ces échecs en `agent_tool_error`, hors score. |
