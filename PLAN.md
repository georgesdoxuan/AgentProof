# AgentProof — Plan d'action

Règle n° 1 : **un parcours complet qui tourne avant toute nouvelle fonctionnalité.**
Mission → agent H → résultat en base → score affiché. Le reste vient après.

Contexte, définitions et architecture : [CONTEXT.md](CONTEXT.md).

---

## Rôles

| Personne | Rôle hackathon | Responsable de |
|---|---|---|
| **Thomas** | CEO · Chef de projet | Planning, arbitrages, points business CEO, Loom, pitch deck, pitch final et Q&A, peer review, post LinkedIn |
| **Georges** | CPO + CTO · Product Owner et déploiement | Vision produit, parcours utilisateur, repo GitHub, architecture, front (v0 → Vercel), déploiement du moteur (HF Space), démo live + plan B |
| **Alexandre** | CAIO · Spécialiste IA | Missions et consignes de l'agent, moteur Python (`hai-agents`), sortie structurée, plan de corrections LLM (HF), comparaison des modèles, retours sur l'Agent API |
| **Mehdi** | CAO · Automatisation | Workflows n8n : formulaire « Teste mon site » → lancement audit → e-mail rapport ; suivi mensuel + alerte score ; relances leads marques et agences |
| **Adonaï** | CDO · Data Analyst | Choix des 10 sites et des paires concurrentes, Supabase (schéma, données), métriques (taux de réussite, latence, coût, cas d'échec), dataset sur HF Hub, graphiques du rapport et du deck |

## Calendrier

| Quand | Livrable officiel | Porteur |
|---|---|---|
| **Mer 18 nov, avant 17 h** | Checkpoint 2 : parcours utilisateur, architecture technique, Loom 2 min (problème + solution + avancement), roadmap jusqu'à jeudi | Thomas (Loom, roadmap), Georges (parcours, archi) |
| **Ven 20 nov, avant 11 h** | Prototype fonctionnel en live · fiche projet + repo sur GitHub · vidéo démo 5 min · peer review | Georges (proto, repo), Thomas (vidéo) |
| **Ven 20 nov, avant 15 h** | Pitch deck 8–12 slides : problème, solution, démo, business model, go-to-market, architecture, limites + roadmap, coût de run | Thomas |
| **Ven 20 nov, après 15 h** | Pitch 6 min + Q&A 4 min (top 6) | Thomas + équipe |
| Chaque soir 17 h → 9 h | Peer review | Tous |

Points de synchro : **9 h 30**, **14 h**, **18 h** (10 min max, debout). Chacun dit : fait / en cours / bloqué.

---

## Mardi 17 nov — « Une mission tourne de bout en bout »

Objectif du soir : **1 mission sur 1 site → résultat structuré + capture en base Supabase.**

- **Thomas** : prévenir les mentors du pivot vers AgentProof. Réserver les créneaux CTO (11 h, 15 h). Créer le canal d'équipe et le tableau de tâches. Lister les cibles à contacter (5 marques mode, 5 agences).
- **Georges** : repo GitHub (fait) + ajouter les 4 membres. Récupérer les crédits H (platform.hcompany.ai) et HF (coupon), créer la clé `HAI_API_KEY`, la partager hors repo. Parcours utilisateur (schéma simple). Premier jet du front sur v0 (landing + classement factice).
- **Alexandre** : premier run avec `h/web-surfer-flash` sur 1 site. Écrire `MissionResult` (sortie structurée) et le bloc de règles de l'agent. Vérifier : récupération des captures, des events, du nombre de tokens. Tester `web-surfer-pro` vs `flash` sur la même mission. Noter chaque surprise dans le README (section Retours).
- **Adonaï** : choisir 10 sites mode FR (mix grandes enseignes et marques DTC) + 1 concurrent par site. Créer le projet Supabase et les tables `sites`, `missions`, `runs`. Remplir `sites` et `missions`.
- **Mehdi** : workflow n8n v0 : webhook « Teste mon site » (URL + e-mail) → ligne dans Supabase → e-mail de confirmation. Préparer le gabarit d'e-mail du rapport.

## Mercredi 18 nov — « 100 runs en base, checkpoint 2 »

Objectif : **10 missions × 10 sites lancées, scores calculés, checkpoint 2 rendu avant 17 h.**

- **Alexandre** : script batch (10 × 10) avec 3 sessions en parallèle max (limite Free). Insertion des runs dans Supabase. Prompt du plan de corrections (HF Inference Providers), comparer 2–3 modèles.
- **Adonaï** : surveiller les runs, nettoyer les résultats, calculer score / latence / tokens par mission / cas d'échec. **Mesurer le coût réel d'une mission** (tokens × prix H) pour le deck.
- **Georges** : moteur en FastAPI sur HF Space (`POST /audit`). Front branché sur Supabase : classement + page rapport par site (score, top 3 blocages, captures, concurrent). Schéma d'architecture pour le checkpoint.
- **Mehdi** : n8n appelle `POST /audit`, attend la fin, envoie le rapport par e-mail. Cron mensuel de relance + alerte si le score baisse.
- **Thomas** : Loom 2 min + roadmap avant 17 h. Point business CEO : valider prix et go-to-market. Premiers contacts marques et agences (avec le classement comme accroche).

## Jeudi 19 nov — « Rapport complet, démo fiable »

Objectif : **parcours complet en ligne : formulaire → audit → rapport → e-mail. Démo répétée 3 fois.**

- **Alexandre** : relancer les runs ratés pour « bug technique » (vs vrais blocages). Boucle « corrections → relance » sur 1 site pour la démo si possible. Finaliser les retours sur l'Agent API.
- **Adonaï** : publier le dataset du classement sur HF Hub. Graphiques pour le deck (score par site, blocages les plus fréquents, coût par audit).
- **Georges** : finitions UX du rapport, vue live de l'agent (lien partagé H) intégrée à la démo. **Plan B : enregistrer une vidéo d'un run complet**. README = fiche projet complète.
- **Mehdi** : tests de bout en bout des workflows, gestion des erreurs (session H en échec, timeout), export des workflows JSON dans le repo.
- **Thomas** : pitch deck v1, script du pitch 6 min, préparation Q&A (objections dans CONTEXT.md). Point business CEO. Répétitions.

## Vendredi 20 nov — « Ship »

- **Avant 11 h** : proto en ligne, repo à jour (README = fiche projet), vidéo démo 5 min, **vérifier que chaque lien est accessible sans compte**.
- **Avant 15 h** : deck final 8–12 slides.
- **14 h** : post LinkedIn (4 tags : Eugenia, Vercel, H Company, Hugging Face).
- **Après 15 h** : pitch. Démo live : on lance une mission sur un site devant le jury, on montre la vue live, puis le rapport déjà calculé.

---

## Chiffres à sortir pour le jury

- Taux de réussite par site et global.
- Latence moyenne par mission (secondes) et nombre d'étapes.
- Tokens et coût par mission, coût d'un audit complet (missions × 2 sites).
- Top des blocages sur les 10 sites, avec captures.
- Taux de faux positifs : runs ratés à cause de l'agent et pas du site (vérifiés à la main sur un échantillon).

## Risques et plan B

| Risque | Plan B |
|---|---|
| Quota H épuisé ou trop lent | Réduire à 5 missions × 10 sites. Passer au plan Builder si besoin. Lancer le batch la nuit. |
| Un site bloque tous les bots | C'est un résultat (`captcha_or_bot_block`), on le garde dans le classement. |
| L'agent échoue pour une raison qui n'est pas le site | Vérifier à la main, marquer le run, le relancer. |
| Démo live qui plante | Vidéo d'un run enregistrée jeudi + rapport déjà calculé en base. |
| HF Space ou n8n en panne | Moteur en CLI local. |

## Definition of done

- Un run = une ligne dans `runs` avec statut, succès, blocage, capture, tokens, durée.
- Un site audité = 10 runs + score + top 3 blocages + plan de corrections + comparaison concurrent.
- Le repo = README lisible par le jury : problème, solution, stack, archi, lien du proto, comment tester, retours sur l'Agent API.
