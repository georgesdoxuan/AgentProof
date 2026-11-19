# Borner les appels externes pour ne pas épuiser le tick

- Type : modification
- Priorité : important
- Auteur : mehdi
- Date : 2026-11-18

## Constat
Revue statique du 18 novembre 2026 : dans web/lib/engine.ts, les fonctions communes h() et hf() ne passent pas de signal de délai d’expiration explicite à fetch. La route web/app/api/tick/route.ts fixe maxDuration à 60 secondes. Un fournisseur lent peut consommer le temps disponible. Il s’agit d’un risque du code, pas d’un incident reproduit ni d’un ralentissement chiffré.

## Demande
Garantir qu’un appel lent ne monopolise pas tout le tick. Définir un délai global interne et des délais d’appels adaptés, en conservant le travail restant pour une reprise sûre. Un délai expiré à la création d’une session ne prouve pas que la session n’a pas été créée : préserver l’identifiant d’idempotence et réconcilier l’état avant toute nouvelle création. Ne pas remplacer un résultat inconnu par un bug du site.

## Comment vérifier
Avec des réponses H et HF simulées lentes ou bloquées, le traitement sort avant le plafond configuré et conserve un état récupérable. Simuler une création de session acceptée par H dont la réponse arrive trop tard : la reprise ne crée pas une seconde session. Simuler un juge lent : la mission reste à vérifier plutôt que d’être déclarée échouée côté site.

## Détails
2026-11-18 — Demande validée par Mehdi pour réduire le délai jusqu’au rapport exploitable avant vendredi 11 h. Priorité initiale : instrumentation et délais explicites ; effort estimé d’une demi-journée à une journée selon les reprises existantes. Mesurer le temps des appels, dépassements de tick et reprises réussies. Ne pas réessayer automatiquement un paiement. Aucun test payant, e-mail réel ou déploiement sans autorisation. Aucun gain chiffré n’est annoncé sans mesure. Conserver le nombre de missions, le juge, les preuves et les contrôles de sécurité.

## Réponse de Georges
- Statut : fait. Délais d'expiration : 20 s sur chaque appel H, 25 s par tentative Hugging Face, 10 s vers n8n (notification), 15 s pour l'e-mail. Création de session : après un délai dépassé, une seconde requête part avec la même clé d'idempotence (H rend la même session) ; ensuite seulement le run passe en erreur.
- Commit : 37f407c (PR #29)
- Pas traité dans la PR #10 (vitesse des audits). Les passes s'arrêtent avant 45 s, mais h() et hf() n'ont toujours pas de délai d'expiration propre.
