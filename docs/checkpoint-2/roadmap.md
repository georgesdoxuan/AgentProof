# AgentProof · roadmap jusqu'au dépôt

Mise à jour le mercredi 18 novembre 2026, 15 h (heure de Paris).

## Où on en est (mercredi 18, 15 h)

- **Produit en ligne** : https://agentproof-iota-tawny.vercel.app. Parcours complet qui tourne : formulaire, agent H en direct, juge Hugging Face, rapport, replay, classement, espace d'équipe.
- **Benchmark ordinateur fait** (17 nov) : 10 sites mode, 36 missions réussies sur 52 (69 %), ~90 s et 0,03 $ par mission.
- **Fiabilité mesurée** : accord juge / agent 81 % (114 / 140 runs), répétabilité 81 % (30 / 37).
- **PR 5 fusionnée** : retours de l'équipe (file d'attente des missions, appels externes bornés, priorité aux audits sur la surveillance).
- **En cours** : benchmark mobile (écran 390×844), accord juge / humain (vérification manuelle d'Adonaï, calcul d'Alexandre).

## Mercredi 18 novembre

| Heure | Tâche | Livrable |
|---|---|---|
| avant 17 h | Checkpoint 2 aux mentors : parcours utilisateur, architecture, Loom 2 min, cette roadmap | `docs/checkpoint-2/` + Loom |
| 17 h → 20 h | Lancer le benchmark mobile sur les 10 sites du classement (5 missions chacun) | runs mobiles dans Supabase |
| soir | Traiter les retours de l'équipe encore ouverts dans `retours/` | PR |
| 17 h → jeudi 9 h | Peer review | formulaire rempli |

## Jeudi 19 novembre · fiabiliser et répéter

| Heure | Tâche | Livrable |
|---|---|---|
| matin | Résultats du benchmark mobile : tableau ordinateur contre mobile dans le README et le classement | README, `/classement` |
| matin | Démo à blanc : 3 audits sur des sites de la liste de démo, en conditions réelles, chronométrés | durées notées, bugs corrigés |
| **midi** | **Accord juge / humain** reçu d'Alexandre : l'afficher sur `/methode` et dans le README, avec la taille de l'échantillon | `/methode`, README |
| après-midi | Export du dataset Hugging Face à jour (ordinateur + mobile) | `georgesdoxuan/agentproof-runs` |
| après-midi | **Repo rendu public** : vérifier qu'aucun secret n'est dans l'historique, puis passer le repo en public | github.com/georgesdoxuan/AgentProof |
| après-midi | Deck refait : 8 à 12 slides dans l'ordre imposé (problème, solution, démo, business model, go-to-market, architecture, limites + roadmap, coût de run) | deck v1 |
| soir | Script du pitch 6 min (base : `pitch.md`) et 3 répétitions chronométrées avec la démo live | script final |
| 17 h → vendredi 9 h | Peer review | formulaire rempli |

## Vendredi 20 novembre · ship

| Heure | Tâche | Livrable |
|---|---|---|
| 8 h → 9 h | `FORM_MISSIONS=3`, `ALLOWED_DOMAINS` de démo, quota H vérifié (réserve de tokens) | config de démo |
| 9 h → 10 h | Vidéo démo de 5 min : un audit de bout en bout, rapport, replay, classement | vidéo |
| 10 h → 10 h 45 | Tester tous les liens **sans être connecté** : site, rapport d'exemple, replay, classement, dataset, repo | liste cochée |
| **avant 11 h** | **Checkpoint 3** : prototype live, fiche projet + repo GitHub (problème, solution, stack, architecture, lien du proto, comment tester), vidéo 5 min, peer review | README + vidéo |
| 11 h → 14 h 30 | Deck final avec les chiffres mobile et juge / humain, captures du produit | deck final |
| **avant 15 h** | **Checkpoint 4** : pitch deck déposé | deck |
| **après 15 h** | Pitch 6 min + Q&A 4 min, démo live lancée au début du pitch | — |
| 14 h | Départ du concours LinkedIn (post public, 4 tags : Eugenia, Vercel, H Company, Hugging Face), clôture le 27 nov à 18 h | post |

## Risques et parades

| Risque | Parade |
|---|---|
| Le site de démo bloque l'agent (anti-bot, IP de datacenter) | liste de démo de sites testés jeudi ; rapport d'exemple déjà terminé en secours |
| Quota H épuisé ou API lente pendant la démo | réserve de tokens dans le moteur ; replay et rapport existants montrés si besoin |
| Accord juge / humain faible | l'afficher tel quel avec la taille de l'échantillon, expliquer les écarts (pages panier prises pour le checkout) |
| Secret dans l'historique git au passage en public | scan de l'historique avant de rendre public ; rotation des clés si besoin |
| Mission trop longue pour la démo (10 à 20 min pour 5 missions) | 3 missions en démo, mission lancée au début du pitch |

## Après le hackathon

Comptes de test fournis par le marchand pour aller jusqu'au paiement, cartes de test émises par nous (Stripe Issuing, Adyen, Swan), d'autres agents que Holo (ChatGPT agent…), un user-agent mobile réel, d'autres secteurs que la mode.
