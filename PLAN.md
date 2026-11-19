# AgentProof — Plan d'action

Contexte, définitions et architecture : [CONTEXT.md](CONTEXT.md). Fiche projet : [README.md](README.md).

## État au mardi 17 nov, après-midi

**Le MVP tourne de bout en bout, en ligne : https://agentproof-iota-tawny.vercel.app**

- Agent H `agentproof-shopper` (modèle léger `holo4-35b-a3b`) : consignes, règles de sécurité, réponse structurée.
- App Next.js sur Vercel : formulaire « Teste mon site » (+ concurrent, + mobile), rapport auto-rafraîchi, classement.
- Supabase : sites, missions (10), audits, runs, captures.
- Juge visuel + plan de corrections : Hugging Face, `Qwen/Qwen3.5-9B`.
- n8n : appel du moteur chaque minute, message Telegram quand un audit se termine.
- Benchmark lancé : 10 sites mode × 5 missions.
- Coût mesuré : 0,01 à 0,02 $ par mission.

Il reste à **fiabiliser, mesurer, raconter**.

## Rôles

| Personne | Rôle hackathon | Responsable de |
|---|---|---|
| **Thomas** | CEO · Chef de projet | Planning, arbitrages, points business, Loom, deck, pitch et Q&A, peer review, post LinkedIn |
| **Georges** | CPO + CTO | App, déploiement, architecture, démo live + plan B, repo |
| **Alexandre** | CAIO | Consignes de l'agent (`agent/agent.json`), qualité du juge, prompts de corrections, comparatif de modèles |
| **Mehdi** | CAO | Workflows n8n : e-mail du rapport au prospect, suivi mensuel + alerte, prospection des sites du classement |
| **Adonaï** | CDO | Choix des sites, vérification manuelle des runs, métriques, dataset HF, graphiques du deck |

## Calendrier officiel

| Quand | Livrable | Porteur |
|---|---|---|
| **Mer 18 nov, avant 17 h** | Checkpoint 2 : parcours utilisateur, architecture, Loom 2 min, roadmap | Thomas (Loom, roadmap), Georges (parcours, archi) |
| **Ven 20 nov, avant 11 h** | Proto live · fiche projet + repo GitHub · vidéo démo 5 min · peer review | Georges, Thomas |
| **Ven 20 nov, avant 15 h** | Deck 8–12 slides : problème, solution, démo, business model, go-to-market, archi, limites + roadmap, coût de run | Thomas |
| **Ven 20 nov, après 15 h** | Pitch 6 min + Q&A 4 min | Thomas + équipe |
| Chaque soir 17 h → 9 h | Peer review | Tous |

Synchros : 9 h 30, 14 h, 18 h (10 min).

## Mardi 17 nov (reste de la journée)

- **Thomas** : prévenir les mentors du pivot. Ajouter les 4 membres au repo GitHub (pseudos à donner à Georges). Lister 5 marques et 5 agences à contacter.
- **Alexandre** : relire les réponses de l'agent dans les rapports du benchmark ; ajuster `agent/agent.json` si l'agent se trompe (puis `PATCH /api/v2/agents/agentproof-shopper`).
- **Adonaï** : vérifier à la main 15 runs du benchmark (capture + replay) : l'agent et le juge ont-ils raison ? Noter dans un tableau.
- **Mehdi** : ouvrir le workflow n8n « AgentProof — moteur et notifications », comprendre le tick ; préparer l'e-mail du rapport (credential SMTP ou Gmail).
- **Georges** : surveiller le benchmark, publier le dataset HF (`scripts/export-hf.sh`), corriger les bugs remontés.

## Mercredi 18 nov — checkpoint 2

- **Georges** : schéma d'architecture (celui de CONTEXT.md § 9) et parcours utilisateur en captures du site.
- **Thomas** : Loom 2 min avec démo réelle, roadmap jusqu'à vendredi. Point business : valider les prix.
- **Alexandre** : comparatif `holo4-35b-a3b` contre `holo4-27b` sur 10 runs identiques (réussite, durée, coût). Taux d'accord du juge avec la vérification d'Adonaï.
- **Adonaï** : métriques du benchmark (score par site, blocages les plus fréquents, coût moyen, durée moyenne). Graphiques.
- **Mehdi** : e-mail du rapport au prospect quand un audit se termine. Relance mensuelle des audits (cron n8n + `POST /api/audits`).

## Jeudi 19 nov — fiabiliser et répéter

- Relancer les sites dont les échecs viennent de l'agent et pas du site.
- Benchmark mobile sur 5 sites si le budget le permet.
- **Plan B démo** : enregistrer une vidéo d'un audit complet + garder un rapport déjà calculé.
- Deck v1, script du pitch, répétitions (3 fois en conditions réelles).

## Vendredi 20 nov — ship

- Avant 11 h : vérifier tous les liens sans être connecté (site, rapport, replay, dataset, repo public ou accès jury).
- Avant 15 h : deck final.
- 14 h : post LinkedIn (4 tags : Eugenia, Vercel, H Company, Hugging Face).
- Démo live : lancer un audit sur un site proposé par le jury, montrer le replay en direct, puis un rapport déjà fini.

## Chiffres à sortir pour le jury

- Taux de réussite par site et global, durée moyenne, étapes moyennes.
- Coût par mission et par audit (déjà dans chaque rapport).
- Top des blocages avec captures.
- Accord du juge visuel avec la vérification humaine.

## Risques et plan B

| Risque | Plan B |
|---|---|
| Limite H de 5 requêtes/min | Le tick la respecte ; un audit de 5 missions prend 4 à 8 min sans file d'attente (mesuré le 19/11). Plan Builder (20 $) si besoin de plus. |
| Un site bloque les bots | C'est un résultat (`captcha_or_bot_block`). |
| L'agent échoue à cause de lui-même | Vérification manuelle, relance de l'audit. |
| Démo live qui plante | Vidéo + rapport déjà calculé. |
| n8n en panne | Lancer le tick à la main : `curl …/api/tick -H "x-tick-secret: …"`. |
