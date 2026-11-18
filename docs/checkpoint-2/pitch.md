# AgentProof · texte du pitch

Deux versions : le **Loom de 2 minutes** pour le checkpoint 2 (mercredi 18 nov, avant 17 h) et le **pitch final de 6 minutes** (vendredi 20 nov, après 15 h).
Les chiffres viennent du benchmark du 17 nov (README, section « Résultats ») : à mettre à jour si le benchmark mobile ou l'accord juge / humain tombent avant vendredi.

---

## 1. Loom 2 minutes (checkpoint 2)

Environ 300 mots, débit calme. Entre crochets : ce qu'on montre à l'écran.

### 0:00 – 0:20 · Le problème

[Écran : page d'accueil d'AgentProof]

> Demain, ce ne sera plus toujours un humain qui achète sur votre site, ce sera son agent IA : « trouve-moi un pull noir en M à moins de 60 euros et commande-le ».
> Le problème : 63 % des responsables e-commerce disent que leur tunnel d'achat ne peut pas être finalisé par un agent. Et quand l'agent bloque, il part chez le concurrent sans laisser de trace. Le marchand ne le voit jamais.

### 0:20 – 0:45 · La solution

[Écran : formulaire « Lancer l'audit », saisir un site et un concurrent]

> AgentProof, c'est un client mystère IA. Les outils actuels lisent le code du site et disent « en théorie, un agent devrait pouvoir acheter ». Nous, on envoie un vrai agent computer-use de H Company, Holo, qui regarde l'écran et clique comme un client.
> Il joue cinq missions d'achat réalistes, recherche, filtre de prix, taille, promo, panier, jusqu'à la première page du checkout. Il ne paie jamais.

### 0:45 – 1:25 · Démo

[Écran : un rapport terminé, par exemple le rapport d'exemple de l'accueil]

> Voici le rapport. Un score : la part des missions menées jusqu'au checkout. La comparaison avec le concurrent. Les blocages classés par impact. Pour chaque échec, la capture du moment exact où l'agent bloque.
> [Cliquer « Voir le replay »] Et le replay étape par étape : ce que l'agent voyait, où il a cliqué, pourquoi.
> Un juge visuel Hugging Face relit la dernière capture à l'aveugle, sans connaître l'avis de l'agent, pour éviter les faux succès. Puis un LLM écrit le plan de corrections.

### 1:25 – 1:50 · Avancement

[Écran : classement public]

> Le produit est en ligne. On a audité 10 sites mode français : 36 missions réussies sur 52, soit 69 %. Kiabi est à 0 sur 5, bloqué par son anti-bot. Une mission, c'est environ 90 secondes et 3 centimes.
> Le juge est d'accord avec l'agent dans 81 % des 140 runs vérifiés, et un même site rejoué donne le même verdict dans 81 % des cas.

### 1:50 – 2:00 · La suite

> Cette semaine : le benchmark mobile, l'accord du juge avec un humain, et la démo live vendredi devant vous. Le classement est gratuit, l'audit est à 490 euros, le suivi mensuel à 149 euros. Merci !

---

## 2. Pitch final 6 minutes (vendredi 20 nov)

Environ 850 mots. Suit l'ordre du deck demandé (problème, solution, démo, business model, go-to-market, architecture, limites et roadmap, coût de run). La démo live est le cœur : lancer la mission **au début** du pitch pour qu'elle ait le temps de tourner.

### 0:00 – 0:40 · Accroche et problème

> [Lancer tout de suite un audit sur un site de la liste de démo, puis revenir aux slides.]
>
> Je viens de lancer un agent IA sur un vrai site e-commerce. Il est en train d'essayer d'acheter, en direct. On y revient dans trois minutes.
>
> Pourquoi ? Parce que les agents commencent à faire les courses à notre place. ChatGPT, Perplexity, les navigateurs agentiques : « trouve-moi un pull noir en M à moins de 60 euros et commande-le ».
> Sur beaucoup de sites, l'agent bloque. Un bandeau cookies qui cache « Ajouter au panier ». Un sélecteur de taille qu'il ne sait pas cliquer. Un captcha. Il abandonne, il achète ailleurs, et le marchand ne le sait pas.
> 63 % des responsables e-commerce disent que leur tunnel ne peut pas être finalisé par un agent. Et 61 % n'ont pas de budget pour ça cette année : il faut donc un outil simple et pas cher.

### 0:40 – 1:30 · Solution

> AgentProof, c'est un client mystère IA.
> Les outils qui existent, comme celui de Shopify, lisent le code du site. Ils disent : « en théorie, un agent devrait pouvoir acheter ». Nous, on envoie un agent qui essaie vraiment. Un agent computer-use, Holo de H Company, qui regarde l'écran et clique. C'est justement l'interface qu'on mesure : une API ne voit pas qu'un bandeau masque le bouton.
>
> En cinq étapes : des missions d'achat réalistes, un score, des preuves en capture et en replay, la comparaison avec un concurrent, et un plan de corrections classé par impact.
> Une règle non négociable : l'agent s'arrête à la première page du checkout. Il ne crée pas de compte, ne saisit aucune donnée personnelle, ne résout pas de captcha et ne paie jamais.

### 1:30 – 3:00 · Démo

> [Revenir sur le rapport lancé au début. Il se remplit tout seul.]
>
> Voilà le rapport en train de se remplir. Les missions en cours, puis terminées.
> [Ouvrir une mission] Ici, la dernière capture de l'agent. [Cliquer « Voir le replay »] Et le replay : à chaque étape, l'écran, l'action, le point cliqué et le raisonnement de l'agent.
>
> Le point important, c'est la confiance. L'agent pourrait se tromper en disant « j'ai réussi ». Alors un juge visuel, un modèle Hugging Face, relit la dernière capture à l'aveugle, sans connaître l'avis de l'agent. Si le juge ne répond pas, le run sort du score.
> Et quand une mission échoue, on la rejoue une fois avant de conclure. Un blocage anti-bot ou une rupture de stock sont affichés à part, hors score : on ne note pas le marchand sur ce qui ne dépend pas de son interface.
>
> [Ouvrir le classement] Le classement public : 10 marques mode françaises. 36 missions réussies sur 52, 69 %. Asphalte et Jules à 5 sur 5. Kiabi à 0 sur 5, bloqué par l'anti-bot, comme le serait un vrai agent client.

### 3:00 – 3:50 · Fiabilité et coût de run

> Les chiffres qu'on mesure :
> - une mission, c'est en moyenne 90 secondes, 19 étapes et 3 centimes. Le benchmark complet de 52 missions a coûté 1,68 dollar ;
> - le juge est d'accord avec l'agent dans 81 % des 140 runs vérifiés ;
> - [à remplir jeudi] le juge est d'accord avec un humain dans __ % des __ runs vérifiés à la main ;
> - un site rejoué deux fois donne le même verdict dans 81 % des cas, donc le classement fait la moyenne des deux derniers passages ;
> - sur mobile, sur les 5 mêmes sites : 57 % de réussite (13 sur 23), contre 96 % sur ordinateur. Les sites prêts sur ordinateur bloquent sur téléphone.
>
> Un audit complet de 5 missions coûte moins de 50 centimes en calcul, rejeux compris. On le vend 490 euros.

### 3:50 – 4:40 · Business model et go-to-market

> Trois offres.
> Le classement public est gratuit : c'est notre aimant à leads. Un marchand qui se voit derrière son concurrent veut savoir pourquoi.
> L'audit complet à 490 euros : score, preuves, comparaison, plan de corrections, rapport PDF et badge « Agent-ready ».
> Le suivi mensuel à 149 euros : l'audit repart chaque mois, et on alerte si le score baisse de 10 points après une mise à jour du site.
>
> On commence par un seul secteur, la mode française, des marques de 5 à 50 millions d'euros de chiffre d'affaires. Et on distribue par les agences e-commerce et SEO : elles vendent déjà des audits, elles revendent le nôtre en marque blanche, avec 30 % de commission.

### 4:40 – 5:20 · Architecture

> [Slide architecture]
> L'app est en Next.js sur Vercel, la base et les captures dans Supabase. Un ordonnanceur appelle notre moteur chaque minute : il lance les sessions de l'agent sur l'Agents API de H, récupère la réponse, la capture et le coût, puis fait juger la capture par Hugging Face Inference. À la fin, un LLM écrit le plan de corrections.
> On a dû construire cet ordonnanceur parce que l'API gratuite est limitée à 5 requêtes par minute et 3 sessions en parallèle. Nos retours sur l'Agent API sont dans le README.
> Les runs sont publiés en dataset ouvert sur Hugging Face.

### 5:20 – 6:00 · Limites, roadmap et fin

> Nos limites, honnêtement : le navigateur tourne depuis une IP de datacenter, donc certains anti-bots nous bloquent. Le juge limite les faux succès, pas encore tous les faux échecs.
> La suite : d'autres agents que Holo, comme ChatGPT agent, des comptes de test fournis par le marchand pour aller jusqu'au paiement, et d'autres secteurs que la mode.
>
> Les agents vont devenir des clients. AgentProof dit aux marchands, preuves à l'appui, s'ils peuvent leur vendre. Merci.

---

## Aide-mémoire chiffres

| Chiffre | Valeur | Source |
|---|---|---|
| Responsables e-commerce dont le tunnel n'est pas finalisable par un agent | 63 % (59 répondants) | Blend Commerce, juil.–août 2026 |
| Taux de réussite benchmark ordinateur | 36 / 52 missions, 69 % | README, benchmark du 17 nov |
| Durée et étapes par mission | ~90 s, ~19 étapes | idem |
| Coût | 0,03 $ par mission, 1,68 $ au total | idem |
| Accord juge / agent | 114 / 140 runs, 81 % | README, Fiabilité |
| Répétabilité | 30 / 37 missions comparables, 81 % | idem |
| Accord juge / humain | à venir jeudi midi | retours/alexandre |
| Benchmark mobile (5 sites) | 13 / 23, 57 %, contre 45 / 47, 96 % sur ordinateur | README, benchmark du 18 nov |
| Prix | gratuit / 490 € / 149 € par mois / 30 % agences | CONTEXT.md |
