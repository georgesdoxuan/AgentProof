Projet AgentProof (hackathon H Company × Hugging Face, 16–20 nov 2026).
Lis CONTEXT.md (produit, définitions, archi, contraintes) et PLAN.md (rôles, calendrier) avant toute tâche.

Règles :
- Un parcours complet qui tourne avant toute nouvelle fonctionnalité.
- Utiliser les définitions de CONTEXT.md § 6 (mission, run, succès, blocage, score) sans les changer.
- Toute consigne envoyée à l'agent inclut les règles de CONTEXT.md § 7 (jamais payer, jamais de données perso, jamais de captcha).
- Aucun secret dans le repo : clés dans `.env` (ignoré par git).
- Noter chaque surprise de l'Agent API dans la section « Retours » du README.

Accès local pour Claude (sans e-mail ni mot de passe) :
- `npm --prefix web run dev`, puis ouvrir `http://localhost:3123/api/auth/dev?email=claude@agentproof.test&next=/espace` : session ouverte et équipe créée si besoin. La route répond 404 hors `next dev`.
- Équipe de Georges : `claude@agentproof.test` est **admin** de son équipe « Espace de gdo ». Après la connexion dev ci-dessus, choisir « Espace de gdo » dans le sélecteur d'équipe (barre de gauche) pour voir son espace comme lui. Le local utilise la base Supabase de production : lancer un audit ou cocher une correction y est réel (crédits H dépensés). Demander avant de lancer un audit.
- Clés : `web/.env.local` (Supabase, H, HF) et `~/.config/agentproof/.env` (Vercel, HF, H). Ne jamais les committer.
