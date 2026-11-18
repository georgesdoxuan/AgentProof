# Loom 2 minutes · texte du présentateur

Site : https://agentproof-iota-tawny.vercel.app (pas besoin de se connecter).
Avant de commencer : un onglet sur l'accueil, un 2e onglet sur le rapport Promod (bouton « Voir un exemple de rapport »).

---

**0:00 · Le problème**
*(Accueil, en haut de la page. Ne clique sur rien.)*

« Demain, ce ne sera plus toujours un humain qui achète sur votre site. Ce sera son agent IA : "trouve-moi un pull noir en M à moins de 60 euros et commande-le". Or 63 % des responsables e-commerce disent qu'un agent ne peut pas finaliser un achat sur leur site. Quand l'agent bloque, il part chez le concurrent sans laisser de trace. Le marchand ne le voit jamais. »

**0:20 · La solution**
*(Clique « Tester mon site ». Montre les champs du formulaire avec la souris. Ne clique pas « Lancer l'audit ».)*

« AgentProof, c'est un client mystère IA. Les outils actuels lisent le code du site. Nous, on envoie un vrai agent computer-use de H Company, Holo, qui regarde l'écran et clique comme un client. Vous donnez votre site et un concurrent. L'agent joue cinq missions d'achat : recherche, filtre de prix, taille, promo, panier. Il va jusqu'à la première page du checkout et ne paie jamais. »

**0:45 · Démo**
*(Onglet du rapport Promod. Montre le score 60 %, puis descends à « Ce qui arrête l'agent. ». Sur la mission « Menu + filtre taille », clique « Voir le replay » et fais défiler quelques étapes. Reviens avec « ‹ Rapport Promod » et descends à « Plan de corrections. ».)*

« Voici le rapport. Un score : la part des missions menées jusqu'au checkout, ici 3 sur 5. Les blocages, classés par fréquence. Pour chaque échec, la capture du moment exact où l'agent bloque. Et le replay étape par étape : ce que l'agent voyait, où il a cliqué, pourquoi. Un juge visuel Hugging Face relit la dernière capture à l'aveugle, pour éviter les faux succès. Ensuite, un LLM écrit le plan de corrections. »

**1:25 · L'avancement, ce qui bloque, la suite**
*(Clique « Classement » en haut de la page. Montre les sites sur ordinateur en haut, puis descends jusqu'aux lignes « Mobile ».)*

« Où on en est : le produit tourne en ligne, de bout en bout, et on a déjà testé 10 marques de mode.

Côté technique, on a réglé plusieurs problèmes. L'agent croyait parfois avoir réussi alors qu'il était seulement sur le panier : un juge visuel vérifie maintenant chaque résultat à l'aveugle. Un même site ne donnait pas toujours le même résultat : on rejoue chaque échec et on fait la moyenne de deux passages. Et quand l'agent H se trompe lui-même, ses erreurs sont mises à part au lieu de pénaliser le site.

Ce qui reste : un audit prend encore 7 à 17 minutes, alors qu'une mission ne dure qu'une minute et demie. La cause : notre moteur ne passait qu'une fois par minute, il lançait une seule mission à chaque passage, et il attendait la fin de l'audit pour rejouer les échecs. Notre correctif passe toutes les 10 secondes, lance les missions dès qu'une place se libère, et rejoue un échec tout de suite. Le but : un audit en 5 minutes environ, avec exactement les mêmes missions et le même juge. Il est prêt, on le met en ligne demain. Les sites avec un anti-bot bloquent encore notre agent. Le mobile ne simule que la taille de l'écran. Et on doit prouver que notre juge est d'accord avec un humain : on le mesure demain.

Vendredi, on fait la démo live devant vous. Merci ! »

---

**Conseils :** parle calmement, environ 2 minutes en tout. Si une page tarde à charger, continue à parler et passe à la suite.
