# AgentProof — Contexte projet

> **On envoie un client mystère IA sur ton site e-commerce.**
> Les autres lisent le plan du magasin. Nous, on envoie un client.

Hackathon H Company × Hugging Face (Eugenia, 16–20 nov 2026), track Creative Entrepreneur. Équipe 6.

---

## 1. Le problème

Demain, des agents IA feront les courses : « Trouve-moi un pull noir en taille M à moins de 60 € et commande-le. »

Sur beaucoup de sites, l'agent bloque : bandeau cookies qui masque le bouton, pop-up newsletter, sélecteur de taille illisible, captcha, bouton qui ne réagit pas. L'agent abandonne et achète chez le concurrent. Le marchand ne le sait pas.

**Signal :** 63 % des responsables e-commerce disent que leur tunnel d'achat ne peut pas être finalisé par un agent IA (Blend Commerce, sondage auprès de 59 responsables e-commerce, juillet–août 2026). 61 % n'ont pas de budget pour ça en 2026.

## 2. Ce qui existe

Les outils actuels **lisent le code** (balises produit, catalogue, robots.txt). Exemple : l'outil gratuit lancé par Shopify en avril 2026 note un site à partir de son code : « en théorie, un agent devrait pouvoir acheter ».

AgentProof **envoie un vrai agent** qui essaie d'acheter, captures d'écran à l'appui : « voilà ce qui s'est passé quand un agent a essayé ».

**Pourquoi un agent computer-use et pas une automatisation classique :** ce qu'on mesure, c'est justement l'interface. Une API ou un script ne voit pas qu'un bandeau cookies masque « Ajouter au panier ». Seul un agent qui regarde l'écran et clique peut tomber dans le piège, comme un vrai agent client.

## 3. Cibles (personae)

| Persona | Qui | Pourquoi il paie |
|---|---|---|
| **Responsable e-commerce** d'une marque mode française (5–50 M€ de CA, Shopify / PrestaShop / Salesforce Commerce) | Pilote la conversion, suit les KPI du tunnel | Il perd des ventes « agent » sans le voir. Il veut un score, des preuves, une liste de corrections. |
| **Agence e-commerce / SEO** | Vend déjà des audits SEO et UX | Nouvel audit à revendre (« audit agent-ready »), même logique que l'audit SEO. |

On a commencé par **un seul secteur : la mode** (benchmark de 10 marques françaises). Depuis le 19 nov, les missions par défaut valent pour **tout site qui vend des produits physiques** (texte dans `web/lib/engine.ts`, `DEFAULT_MISSIONS`, qui remplace celui de la table `missions` ; slugs, titres en base, succès et score inchangés).

## 4. La solution (le SaaS)

Un client mystère IA en 5 étapes :

1. **Missions** — des missions réalistes (chercher, filtrer, choisir une taille, panier, checkout).
2. **Score** — taux de missions réussies par l'agent.
3. **Preuves** — la capture du moment exact où l'agent abandonne.
4. **Comparaison** — les mêmes missions chez les concurrents.
5. **Corrections** — les problèmes classés par impact, puis on relance les tests.

### Offres

| Offre | Prix (proposition, à valider) | Rôle |
|---|---|---|
| Classement public des sites mode français | Gratuit | Visibilité, génération de leads |
| Audit complet (missions, score, preuves, comparaison concurrent, plan de corrections) | 490 € / site | Conversion |
| Suivi mensuel (tests relancés après chaque mise à jour, alerte si le score chute) | 149 € / mois | Revenu récurrent |
| Canal agences (revente de l'audit) | 30 % de commission | Distribution |

Le classement gratuit attire, l'audit convertit, le suivi crée du récurrent.

### Exemple de livrable (format du rapport)

- Score agent : ton site 45 %, ton concurrent direct 80 % (part des missions menées jusqu'au checkout).
- Top 3 des blocages : bandeau cookies qui masque « Ajouter au panier » (9 missions) · sélecteur de taille non cliquable (6) · captcha avant le paiement (5).
- Pour chaque blocage : capture, explication, correction proposée.

## 5. Périmètre du MVP (hackathon)

**Dans le MVP :**
- 10 missions × 10 sites mode (ordinateur). 30 missions et mobile = roadmap, sauf si l'API le permet facilement.
- Score par site, top blocages, capture du blocage, comparaison avec un concurrent.
- Plan de corrections généré par LLM (Hugging Face).
- Classement public + page rapport par site.
- Formulaire « Teste mon site » → audit lancé → rapport envoyé par e-mail (n8n).
- Démo live : on lance une mission sur un vrai site devant le jury, avec la vue live de l'agent.

**Hors MVP :** paiement Stripe, comptes utilisateurs, multi-agents (ChatGPT agent, etc.), mobile, 30 missions.

## 6. Définitions (tout le monde utilise ces mots)

- **Mission** : une consigne d'achat générique (ex. « trouve un pull noir taille M à moins de 60 € et va jusqu'au checkout »).
- **Run** : une mission exécutée par l'agent sur un site = une session H.
- **Succès** : l'agent atteint la **première page du checkout** (page où le site demande e-mail / adresse, ou page de paiement). On ne saisit aucune donnée personnelle et on ne paie jamais.
- **Blocage** : la raison de l'échec, dans une liste fermée :
  `cookie_banner`, `popup`, `search_failed`, `filter_failed`, `size_selector`, `button_unresponsive`, `captcha_or_bot_block`, `login_required`, `out_of_stock`, `page_error_or_timeout`, `mission_not_applicable` (le catalogue ne propose pas ce que demande la mission), `agent_out_of_steps` (l'agent a épuisé ses 30 étapes sans nommer de blocage ; attribué par le moteur), `agent_tool_error` (l'agent a envoyé au moins 5 appels d'outil mal formés et attribue lui-même son échec au défilement ou à l'outil ; attribué par le moteur), `other`.
- **Score agent** = runs réussis / runs comptés, par site. Hors score : runs non vérifiés par le juge, `out_of_stock`, `captcha_or_bot_block`, `mission_not_applicable`, `agent_out_of_steps`, `agent_tool_error`.

## 7. Règles de l'agent (non négociables)

Ajoutées à chaque consigne de mission :
- Ne jamais saisir de données de paiement, ne jamais valider de commande.
- Ne pas créer de compte, ne pas saisir de données personnelles. S'arrêter à la première page du checkout.
- Ne jamais résoudre de captcha : s'arrêter et signaler `captcha_or_bot_block`.
- Volume faible : quelques runs par site, pas de rafale.

En audit payant, le marchand peut fournir un compte de test ou un site de préproduction pour aller plus loin.

## 8. Les 10 missions du MVP (à affiner par Alexandre)

1. Chercher « pull noir » avec la barre de recherche (ou un produit que le site vend), choisir un article et une option disponible s'il en propose (taille M pour un vêtement), ajouter au panier, aller au checkout.
2. Ouvrir une catégorie de produits via le menu, filtrer si possible (taille, couleur, prix…), ajouter au panier, checkout.
3. Trouver un article à moins de 60 € avec le filtre de prix, ajouter au panier, checkout.
4. Choisir une autre variante que celle par défaut (couleur, taille, contenance…) sur un produit à variantes, ajouter au panier, checkout. Aucun produit à variantes : `mission_not_applicable`.
5. Trouver un article en promotion, ajouter au panier, checkout.
6. Ajouter deux articles différents au panier, checkout.
7. Ajouter un article, passer la quantité à 2 dans le panier, checkout.
8. Trouver les frais de livraison pour la France avant le checkout, puis aller au checkout.
9. Chercher un produit avec une faute de frappe (« pul noir »), ajouter au panier, checkout.
10. Depuis la page d'accueil sans recherche, trouver un haut blanc ou clair, ajouter au panier, checkout.

Les missions restent neutres sur le type de produit (pas de « jean homme » chez une marque femme) : une mission impossible sur un site fausserait son score. Une étape sans objet (taille sur un produit qui n'en a pas) est sautée, pas comptée comme un échec.

## 9. Technologie

### H Company Agents API (le moteur)
- SDK Python : `pip install hai-agents` (Python ≥ 3.10). Clé dans `HAI_API_KEY` (créée sur platform.hcompany.ai/settings/api-keys). SDK TypeScript : `npm install hai-agents`.
- Agents pré-construits : `h/web-surfer-flash` (rapide, navigateur cloud), `h/web-surfer-pro` (tâches multi-étapes). Agent custom possible (navigateur, modèle, instructions).
- Endpoint EU : `https://agp.eu.hcompany.ai/api/v2`.
- Sortie structurée : `run_session(..., answer_schema=MonModelePydantic)` → `result.answer` typé.
- Captures : `client.sessions.get_session_resource(session_id, "screenshots", "step-5.png")`.
- Trajectoire : `GET /sessions/{id}/events` (ce que l'agent a vu et fait). Statut, nombre d'étapes, tokens : `GET /sessions/{id}/status`.
- Vue live partageable (pour la démo) : `sessions/share`.
- Webhooks et long-poll `changes` pour éviter le polling.
- Limites plan Free : **5 requêtes/min par clé**, 3 sessions en parallèle, 60 M tokens / mois (Builder 20 $ : 10 sessions, 1 Md tokens). Lire les vraies valeurs via `GET /sessions/quota` et `GET /quota/tokens`.
- Docs : https://hub.hcompany.ai/agents-api/quickstart.md · index : https://hub.hcompany.ai/llms.txt · SDK : https://github.com/hcompai/hai-agents-python


Exemple minimal (Python ; l'app utilise l'API REST directement) :

```python
from pydantic import BaseModel
from hai_agents import Client

class MissionResult(BaseModel):
    reached_checkout: bool
    blocker_type: str | None   # une valeur de la liste fermée
    blocker_detail: str | None # ce que l'agent a vu
    steps_summary: str

client = Client()
r = client.run_session(
    agent="h/web-surfer-flash",
    messages="Va sur https://exemple.fr ... " + REGLES_AGENT,
    answer_schema=MissionResult,
)
print(r.status, r.answer)
```

### Hugging Face (obligatoire)
- **Inference Providers** (`https://router.huggingface.co/v1`, compatible OpenAI) avec le modèle léger `Qwen/Qwen3.5-9B` : juge visuel sur la dernière capture, et plan de corrections en fin d'audit.
- **Hub** : dataset public des runs (`georgesdoxuan/agentproof-runs`), exporté par `scripts/export-hf.sh`.

### Stack (en production)
| Brique | Outil | Responsable |
|---|---|---|
| Agent | H Agents API, agent catalogue `agentproof-shopper`, modèle `holo4-35b-a3b`, écran 1024×640 (390×844 en mobile) | Alexandre |
| App (front + API) | Next.js 16 + Tailwind, déployé sur Vercel | Georges |
| Base + captures | Supabase (Postgres + Storage public `screenshots`) | Adonaï |
| Ordonnanceur + notifications | n8n : appel de `/api/tick` chaque minute, Telegram quand un audit finit | Mehdi |
| Juge + corrections | HF Inference Providers, `Qwen/Qwen3.5-9B` | Alexandre |

Modèles choisis pour leur coût : environ 0,01 à 0,02 $ par mission côté H, quelques millièmes côté HF.

### Architecture

```
Navigateur ──> Next.js (Vercel) ──> Supabase
                  ▲   │
 n8n chaque min ──┘   ├──> H Agents API (sessions, événements, captures, replay)
                      └──> HF Inference Providers (juge, corrections)
```

Flux d'un audit :
1. Formulaire → `POST /api/audits` : crée le site, l'audit et 5 runs `todo` (10 pour le benchmark).
2. n8n appelle `GET /api/tick` chaque minute (en-tête `x-tick-secret`). Budget : 5 requêtes H par tick (limite des clés Free).
   - vérifie au plus 2 runs lancés via leurs événements ; si fini : télécharge la capture, la range dans Supabase, la fait juger, enregistre réponse, tokens, coût, durée ;
   - lance des runs `todo` tant qu'il reste des places (3 sessions max) et du budget ;
   - clôt les audits finis, écrit le plan de corrections, prévient n8n (Telegram).
3. `/audit/[id]` affiche score, concurrent, top blocages, corrections, captures ; « Voir le replay » crée le lien public H à la demande.

**Succès** = l'agent dit avoir atteint le checkout ET le juge visuel confirme sur la capture.

### Modèle de données (Supabase, projet `agentproof`, ref `jlhmgsubvoqopvntzmvp`, eu-west-3)

- `sites` : domain, name, url, sector
- `missions` : slug, title, instruction, position, active
- `audits` : site_id, compare_to (audit du concurrent), device, status, recommendations
- `runs` : audit_id, mission_id, status (todo → launched → done), session_id, success, reached_checkout, blocker_type, blocker_detail, agent_answer, judge, final_url, screenshot_url, share_url, steps, tokens, cost_usd, duration_s
- vue `site_scores` : dernier audit terminé par site et appareil, avec le score

## 10. Contraintes du hackathon

- **Jury (vendredi)** : ingénieurs H Company, Vercel, Eugenia. Ils notent **un agent qui tourne en live, sur un vrai cas, avec des résultats chiffrés**, pas une idée.
- **Critères** : pertinence et impact 25 % · excellence technique et Agents API 30 % · faisabilité, adoption et apprentissages 25 % · UX, démo et pitch 20 %.
- **Pièges à éviter** : idée trop large, sur-concevoir, IA sans agent, slides sans prototype, ne pas mesurer (taux de réussite, latence, cas d'échec), venir au support sans diagnostic (bug + ce qu'on a testé + capture), liens inaccessibles.
- **Retours sur l'Agent API** = partie du livrable : noter au fil de l'eau ce qui a marché, cassé, surpris (section dédiée dans le README).
- **Rôles obligatoires** : CEO, CTO, CAO, CAIO, CDO, CPO (voir PLAN.md).
- Peer review chaque soir, 17 h → 9 h, obligatoire.
- Concours LinkedIn : post public du 20 nov 14 h au 27 nov 18 h, 4 tags obligatoires (Eugenia, Vercel, H Company, Hugging Face).

Calendrier et livrables détaillés : voir [PLAN.md](PLAN.md).

## 11. Objections et réponses

| Objection | Réponse |
|---|---|
| « Shopify fait déjà un score gratuit. » | Il lit le code, nous on teste pour de vrai. Et on compare les sites entre eux. |
| « Les marchands n'ont pas de budget. » | On entre par le classement gratuit et par les agences. |
| « Holo n'est pas l'agent de ChatGPT. » | On mesure un agent écran performant. Ensuite, on testera plusieurs agents. |
| « Combien ça coûte à faire tourner ? » | Coût mesuré par mission (tokens H) × nombre de missions. Chiffre réel dans le deck. |
