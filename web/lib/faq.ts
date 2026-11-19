// Help centre: the questions, their answers, and the search that finds them.
// Pure data and code, safe in client components. The search runs in the browser: no network call, nothing typed
// leaves the page, results appear as you type. It forgives typos, accents, plurals and everyday words
// ("combien ça coûte" finds the credits answers), in French or English whatever the interface language.
import type { Lang } from "./i18n";

type Text = { fr: string; en: string };
export type Category = "start" | "audits" | "score" | "credits" | "automations" | "team" | "data" | "payment";
export type Faq = {
  id: string;
  cat: Category;
  q: Text;
  a: Text;
  link?: { href: string } & Text; // where to do it in the app
  keys?: string; // extra words people use for this question, both languages
};

export const CATEGORIES: { id: Category; fr: string; en: string }[] = [
  { id: "start", fr: "Démarrer", en: "Getting started" },
  { id: "audits", fr: "Audits et missions", en: "Audits and missions" },
  { id: "score", fr: "Score et rapports", en: "Score and reports" },
  { id: "credits", fr: "Crédits et abonnement", en: "Credits and plan" },
  { id: "automations", fr: "Automations et Slack", en: "Automations and Slack" },
  { id: "team", fr: "Équipe", en: "Team" },
  { id: "data", fr: "Données et légal", en: "Data and legal" },
  { id: "payment", fr: "Test de paiement", en: "Payment test" },
];

export const CONTACT = "gdo@eugeniaschool.com";

export const FAQ: Faq[] = [
  // ---------- Démarrer ----------
  {
    id: "c-est-quoi",
    cat: "start",
    q: { fr: "Que fait AgentProof ?", en: "What does AgentProof do?" },
    a: {
      fr: "Un agent IA essaie d'acheter sur ton site comme un vrai client, jusqu'à la première page du checkout. Tu obtiens un score, la capture de chaque blocage, une comparaison avec un concurrent et un plan de corrections.",
      en: "An AI agent tries to buy on your site like a real customer, up to the first checkout page. You get a score, a screenshot of every blocker, a comparison with a competitor and a fix plan.",
    },
    keys: "presentation produit principe fonctionnement concept a quoi sert what is about overview how it works",
  },
  {
    id: "tester-mon-site",
    cat: "start",
    q: { fr: "Comment tester mon site ?", en: "How do I test my site?" },
    a: {
      fr: "Entre l'adresse de ton site dans « Tester mon site » sur l'accueil, ou clique sur « Lancer un audit » dans ton espace. Le rapport s'ouvre tout de suite et se remplit mission par mission.",
      en: "Enter your site's address in “Test my site” on the home page, or click “Run an audit” in your space. The report opens right away and fills in mission by mission.",
    },
    link: { href: "/espace/nouveau", fr: "Lancer un audit", en: "Run an audit" },
    keys: "lancer commencer demarrer nouvel audit analyser verifier start launch run new check analyse",
  },
  {
    id: "compte",
    cat: "start",
    q: { fr: "Faut-il un mot de passe pour se connecter ?", en: "Do I need a password to sign in?" },
    a: {
      fr: "Non. Tu reçois un lien de connexion par e-mail, valable 15 minutes. Un espace d'équipe est créé à ta première connexion.",
      en: "No. You get a sign-in link by e-mail, valid for 15 minutes. A team space is created the first time you sign in.",
    },
    link: { href: "/connexion", fr: "Se connecter", en: "Sign in" },
    keys: "connexion inscription creer compte login identifiant lien magique email signup register account magic link",
  },
  {
    id: "gratuit",
    cat: "start",
    q: { fr: "Est-ce gratuit ?", en: "Is it free?" },
    a: {
      fr: "Le classement public est gratuit, et chaque espace a 15 crédits par mois, soit 3 audits. Le paiement en ligne n'est pas encore ouvert : pendant l'essai, rien n'est bloqué ni facturé.",
      en: "The public ranking is free, and every space gets 15 credits a month, that is 3 audits. Online payment is not open yet: during the trial, nothing is blocked or charged.",
    },
    link: { href: "/espace/abonnement", fr: "Abonnement et crédits", en: "Plan and credits" },
    keys: "prix tarif cout combien payer gratuitement essai offre free trial price cost how much",
  },

  // ---------- Audits et missions ----------
  {
    id: "duree",
    cat: "audits",
    q: { fr: "Combien de temps dure un audit ?", en: "How long does an audit take?" },
    a: {
      fr: "10 à 20 minutes pour cinq missions. Le rapport est consultable pendant l'audit, et un e-mail part quand il est terminé.",
      en: "10 to 20 minutes for five missions. You can read the report while the audit runs, and an e-mail goes out when it is done.",
    },
    keys: "temps duree long rapide attendre minutes delai fini termine time wait fast slow finished",
  },
  {
    id: "missions",
    cat: "audits",
    q: { fr: "Quelles missions l'agent joue-t-il ?", en: "Which missions does the agent play?" },
    a: {
      fr: "Des achats réalistes : recherche et taille, navigation par le menu, filtre de prix, variante de couleur, article en promotion. Elles restent neutres sur le type de produit, pour ne jamais demander un article que le site ne vend pas.",
      en: "Realistic purchases: search and size, browsing through the menu, price filter, colour variant, item on sale. They stay neutral on the product type, so they never ask for an item the site does not sell.",
    },
    keys: "scenario parcours taches consigne recherche filtre taille couleur promo tasks journey scenarios",
  },
  {
    id: "missions-perso",
    cat: "audits",
    q: { fr: "Puis-je écrire mes propres missions ?", en: "Can I write my own missions?" },
    a: {
      fr: "Oui. Au lancement d'un audit, coche les missions voulues, modifie-en une pour cet audit ou pour toute l'équipe, ou ajoute les tiennes en langage courant. L'agent s'arrête toujours au checkout.",
      en: "Yes. When you run an audit, tick the missions you want, edit one for this audit or for the whole team, or add your own in plain words. The agent always stops at checkout.",
    },
    link: { href: "/espace/nouveau", fr: "Lancer un audit", en: "Run an audit" },
    keys: "personnaliser modifier ajouter creer mission sur mesure custom edit add personalise",
  },
  {
    id: "agent-paie",
    cat: "audits",
    q: { fr: "L'agent paie-t-il ou crée-t-il un compte ?", en: "Does the agent pay or create an account?" },
    a: {
      fr: "Jamais pendant un audit. Il s'arrête à la première page du checkout, ne saisit aucune donnée personnelle et ne résout aucun captcha. Le paiement se mesure à part, avec le test de paiement.",
      en: "Never during an audit. It stops at the first checkout page, enters no personal data and solves no captcha. Payment is measured separately, with the payment test.",
    },
    keys: "commande achat carte bancaire captcha inscription donnees regles securite order buy card rules safe",
  },
  {
    id: "quel-agent",
    cat: "audits",
    q: { fr: "Quel agent IA est utilisé ?", en: "Which AI agent is used?" },
    a: {
      fr: "Holo, de H Company. Il voit l'écran, clique et tape comme un humain, dans un navigateur cloud. Un juge visuel open source sur Hugging Face vérifie ensuite chaque mission.",
      en: "Holo, by H Company. It sees the screen, clicks and types like a human, in a cloud browser. An open-source visual judge on Hugging Face then checks every mission.",
    },
    keys: "modele ia intelligence artificielle holo h company hugging face robot bot llm model ai",
  },
  {
    id: "concurrent",
    cat: "audits",
    q: { fr: "Comment me comparer à un concurrent ?", en: "How do I compare with a competitor?" },
    a: {
      fr: "Ajoute l'adresse d'un concurrent au lancement de l'audit : l'agent joue les mêmes missions chez lui, sur ses pages publiques et sans payer. Les deux scores s'affichent côte à côte.",
      en: "Add a competitor's address when you run the audit: the agent plays the same missions on its site, on public pages only and without paying. Both scores appear side by side.",
    },
    keys: "comparaison comparer concurrence benchmark rival versus vs competition compare",
  },
  {
    id: "mobile",
    cat: "audits",
    q: { fr: "Peut-on tester la version mobile ?", en: "Can I test the mobile version?" },
    a: {
      fr: "Oui : choisis « Mobile » au lancement. L'agent utilise un écran de téléphone simulé (390 × 844), pas un vrai smartphone.",
      en: "Yes: choose “Mobile” when you run the audit. The agent uses a simulated phone screen (390 × 844), not a real smartphone.",
    },
    keys: "telephone smartphone portable iphone android ecran responsive phone",
  },
  {
    id: "deux-modeles",
    cat: "audits",
    q: { fr: "À quoi sert la comparaison de deux modèles ?", en: "What is the two-model comparison for?" },
    a: {
      fr: "Elle fait jouer les mêmes missions par l'agent rapide et l'agent précis : réussite, durée et coût côte à côte. Elle double le coût de l'audit et se fait sans concurrent.",
      en: "It has the fast and the precise agent play the same missions: success, duration and cost side by side. It doubles the audit cost and runs without a competitor.",
    },
    keys: "modeles rapide precis flash pro comparer agents fast precise models",
  },
  {
    id: "autorisation",
    cat: "audits",
    q: { fr: "Puis-je tester un site qui n'est pas le mien ?", en: "Can I test a site that is not mine?" },
    a: {
      fr: "En lançant un audit, tu confirmes gérer le site ou être autorisé à le tester. Un concurrent n'est visité que sur ses pages publiques, comme un client, sans payer.",
      en: "By running an audit, you confirm you run the site or are allowed to test it. A competitor is only visited on its public pages, like a customer, without paying.",
    },
    keys: "autorise permission droit accord proprietaire allowed own owner",
  },

  // ---------- Score et rapports ----------
  {
    id: "calcul-score",
    cat: "score",
    q: { fr: "Comment le score est-il calculé ?", en: "How is the score computed?" },
    a: {
      fr: "Score = missions réussies ÷ missions vérifiées. Une mission est réussie quand l'agent atteint la première page du checkout et que le juge visuel le confirme sur la capture. Le panier seul ne compte pas.",
      en: "Score = passed missions ÷ verified missions. A mission passes when the agent reaches the first checkout page and the visual judge confirms it on the screenshot. The cart alone does not count.",
    },
    link: { href: "/methode", fr: "Méthode", en: "Method" },
    keys: "note pourcentage resultat taux reussite calcul formule methode rating percentage result success rate",
  },
  {
    id: "hors-score",
    cat: "score",
    q: { fr: "Que veut dire « hors score » ?", en: "What does “out of score” mean?" },
    a: {
      fr: "Une mission sans lien avec l'interface du site : rupture de stock, anti-bot, article absent du catalogue, ou erreur de l'agent. Elle est affichée à part et ne compte pas dans le score, comme une mission que le juge n'a pas pu vérifier.",
      en: "A mission unrelated to the site's interface: out of stock, anti-bot, item not in the catalogue, or an agent error. It is shown separately and does not count in the score, like a mission the judge could not verify.",
    },
    keys: "exclu exclue gris non verifiee rupture stock anti bot captcha excluded grey unverified",
  },
  {
    id: "rejoue",
    cat: "score",
    q: { fr: "Un échec peut-il venir du hasard ?", en: "Can a failure be bad luck?" },
    a: {
      fr: "Chaque mission ratée est rejouée une fois avant la fin de l'audit, et c'est le second essai qui compte. Dans le classement, le score est la moyenne des deux derniers passages.",
      en: "Every failed mission is replayed once before the audit ends, and the second attempt is the one that counts. In the ranking, the score is the average of the last two runs.",
    },
    keys: "fiable fiabilite hasard rejouer relance second essai erreur faux reliable luck retry replay wrong",
  },
  {
    id: "blocages",
    cat: "score",
    q: { fr: "Comment savoir quoi corriger ?", en: "How do I know what to fix?" },
    a: {
      fr: "Le rapport classe les blocages par impact (bandeau cookies, pop-up, sélecteur de taille…), avec la capture du moment où l'agent abandonne et une correction proposée.",
      en: "The report ranks blockers by impact (cookie banner, pop-up, size selector…), with a screenshot of the moment the agent gives up and a suggested fix.",
    },
    keys: "corrections recommandations blocage probleme bug ameliorer plan conseils fix issues blockers improve recommendations",
  },
  {
    id: "marquer-corrige",
    cat: "score",
    q: { fr: "Comment vérifier qu'une correction marche ?", en: "How do I check that a fix works?" },
    a: {
      fr: "Marque le blocage comme corrigé dans le rapport, puis relance un audit. S'il a disparu, il passe dans « Corrections vérifiées ».",
      en: "Mark the blocker as fixed in the report, then run a new audit. If it is gone, it moves to “Verified fixes”.",
    },
    keys: "corrige corrigee marquer cocher verifier relancer fixed mark tick verify rerun",
  },
  {
    id: "replay",
    cat: "score",
    q: { fr: "Puis-je voir ce que l'agent a fait ?", en: "Can I see what the agent did?" },
    a: {
      fr: "Oui. Chaque mission a sa capture d'écran et un replay pas à pas : clique sur « Voir le replay » dans le rapport.",
      en: "Yes. Every mission has its screenshot and a step-by-step replay: click “See the replay” in the report.",
    },
    keys: "video enregistrement capture ecran screenshot trajet etapes preuve recording proof steps",
  },
  {
    id: "pdf",
    cat: "score",
    q: { fr: "Comment partager un rapport ?", en: "How do I share a report?" },
    a: {
      fr: "Envoie le lien du rapport, ou télécharge-le en PDF depuis le rapport. Les membres de ton équipe le retrouvent dans Rapports.",
      en: "Send the report link, or download it as a PDF from the report. Your team members find it in Reports.",
    },
    keys: "partager envoyer exporter telecharger pdf imprimer lien share send export download print",
  },
  {
    id: "corbeille",
    cat: "score",
    q: { fr: "Comment supprimer un rapport ?", en: "How do I delete a report?" },
    a: {
      fr: "Mets-le à la corbeille depuis Rapports. Tu peux le restaurer ou le supprimer définitivement. Un site entier se met à la corbeille depuis Sites.",
      en: "Move it to the trash from Reports. You can restore it or delete it for good. A whole site goes to the trash from Sites.",
    },
    link: { href: "/espace/rapports", fr: "Rapports", en: "Reports" },
    keys: "supprimer effacer corbeille restaurer retirer favori renommer delete remove trash restore rename favourite",
  },
  {
    id: "classement",
    cat: "score",
    q: { fr: "Mon site est dans le classement : puis-je contester ?", en: "My site is in the ranking: can I dispute it?" },
    a: {
      fr: "Oui : écris-nous avec le lien du rapport. On vérifie la capture et le replay à la main, puis on corrige ou on relance la mission.",
      en: "Yes: write to us with the report link. We check the screenshot and the replay by hand, then fix or rerun the mission.",
    },
    link: { href: "/classement", fr: "Classement", en: "Ranking" },
    keys: "contester classement erreur reclamation retirer enlever ranking dispute wrong remove complaint",
  },

  // ---------- Crédits et abonnement ----------
  {
    id: "prix-audit",
    cat: "credits",
    q: { fr: "Combien coûte un audit ?", en: "How much does an audit cost?" },
    a: {
      fr: "Cinq crédits, un par mission. L'offre gratuite en donne 15 par mois, soit 3 audits. Pendant l'essai, rien n'est facturé.",
      en: "Five credits, one per mission. The free plan gives 15 a month, that is 3 audits. During the trial, nothing is charged.",
    },
    link: { href: "/espace/abonnement", fr: "Abonnement et crédits", en: "Plan and credits" },
    keys: "prix cout combien tarif payer facture audit price cost how much pay",
  },
  {
    id: "credit",
    cat: "credits",
    q: { fr: "C'est quoi un crédit ?", en: "What is a credit?" },
    a: {
      fr: "Une mission jouée par l'agent sur un site. Un audit complet de cinq missions utilise cinq crédits, concurrent compris mission par mission. Un test de paiement en utilise deux.",
      en: "One mission the agent runs on a site. A full five-mission audit uses five credits, the competitor counted mission by mission. A payment test uses two.",
    },
    link: { href: "/espace/abonnement", fr: "Abonnement et crédits", en: "Plan and credits" },
    keys: "credits consommation cout prix combien bareme decompte usage cost price how much",
  },
  {
    id: "offres",
    cat: "credits",
    q: { fr: "Quelles sont les offres ?", en: "What are the plans?" },
    a: {
      fr: "Gratuit : le classement public et 15 crédits par mois, soit 3 audits. Audit complet : 490 € par site, un rapport ponctuel. Suivi mensuel : 149 € par mois, avec un audit complet automatique chaque mois, tes pages relues chaque jour sans agent ni crédit, et 150 crédits pour relancer des audits quand tu veux (5 crédits par audit, l'audit automatique compris : environ 30 audits par mois). Agences : 600 crédits pour plusieurs sites clients. Rien n'est facturé tant que le paiement en ligne n'est pas ouvert.",
      en: "Free: the public ranking and 15 credits a month, that is 3 audits. Full audit: €490 per site, a one-off report. Monthly tracking: €149 a month, with an automatic full audit every month, your pages read daily without the agent and without credits, and 150 credits to rerun audits whenever you want (5 credits per audit, the automatic one included: about 30 audits a month). Agencies: 600 credits for several client sites. Nothing is charged while online payment is closed.",
    },
    link: { href: "/espace/abonnement", fr: "Abonnement et crédits", en: "Plan and credits" },
    keys: "abonnement forfait plan tarifs prix offre agence mensuel subscription pricing price agency monthly",
  },
  {
    id: "essai-ou-audit",
    cat: "credits",
    q: { fr: "Qu'apporte l'audit à 490 € de plus que l'essai gratuit ?", en: "What does the €490 audit add to the free trial?" },
    a: {
      fr: "Aujourd'hui, rien : c'est le même audit (cinq missions, captures, replays, comparaison avec un concurrent, plan de corrections en PDF), offert pendant l'essai car le paiement en ligne n'est pas encore ouvert. Les prix affichés sont ceux qui s'appliqueront à l'ouverture du paiement ; rien n'est facturé avant. Le suivi mensuel, lui, ajoute l'audit automatique chaque mois et la relecture quotidienne des pages.",
      en: "Today, nothing: it is the same audit (five missions, screenshots, replays, competitor comparison, fix plan as a PDF), free during the trial because online payment is not open yet. The prices shown are those that will apply once payment opens; nothing is charged before. The monthly plan adds the automatic monthly audit and the daily page reads.",
    },
    link: { href: "/#tarifs", fr: "Tarifs", en: "Pricing" },
    keys: "essai gratuit difference 490 audit payant unite valeur pourquoi trial free difference paid one-off why",
  },
  {
    id: "plus-de-credits",
    cat: "credits",
    q: { fr: "Que se passe-t-il quand je n'ai plus de crédits ?", en: "What happens when I run out of credits?" },
    a: {
      fr: "Pendant l'essai, rien n'est bloqué ni facturé. Tu es prévenu à 80 % et à 100 % du forfait, par e-mail et sur Slack si tu l'as branché. Les crédits repartent le 1er de chaque mois.",
      en: "During the trial, nothing is blocked or charged. You are alerted at 80% and 100% of the plan, by e-mail and on Slack if connected. Credits renew on the 1st of each month.",
    },
    keys: "epuise depasse limite quota plus assez renouvellement alerte reset limit exceeded renew alert",
  },
  {
    id: "resilier",
    cat: "credits",
    q: { fr: "Comment changer d'offre ou résilier ?", en: "How do I change plan or cancel?" },
    a: {
      fr: "Le paiement en ligne n'est pas encore ouvert : il n'y a rien à résilier. Le changement d'offre arrive bientôt dans Abonnement et crédits.",
      en: "Online payment is not open yet: there is nothing to cancel. Changing plan is coming soon in Plan and credits.",
    },
    link: { href: "/espace/abonnement", fr: "Abonnement et crédits", en: "Plan and credits" },
    keys: "resilier annuler arreter changer offre abonnement upgrade cancel change plan stop subscription",
  },
  {
    id: "remboursement",
    cat: "credits",
    q: { fr: "Puis-je être remboursé ?", en: "Can I get a refund?" },
    a: {
      fr: "Le paiement en ligne n'est pas encore ouvert : lancer un audit ne coûte rien, il n'y a donc rien à rembourser.",
      en: "Online payment is not open yet: running an audit costs nothing, so there is nothing to refund.",
    },
    link: { href: "/remboursements", fr: "Remboursements", en: "Refunds" },
    keys: "rembourser remboursement retractation argent rendre refund money back withdrawal",
  },
  {
    id: "replay-credit",
    cat: "credits",
    q: { fr: "Les missions rejouées sont-elles comptées ?", en: "Do replayed missions count?" },
    a: {
      fr: "Oui, une mission ratée rejouée utilise un crédit, comme une mission d'audit automatique. Les vérifications de pages des automations, elles, sont gratuites.",
      en: "Yes, a replayed failed mission uses one credit, like a mission of an automatic audit. Page checks by automations are free.",
    },
    keys: "rejoue relance automatique compte facture gratuit replay rerun automatic charged free",
  },

  // ---------- Automations et Slack ----------
  {
    id: "automations-role",
    cat: "automations",
    q: { fr: "Que font les automations ?", en: "What do automations do?" },
    a: {
      fr: "Elles relisent tes pages (bandeau cookies, captcha, boutons, formulaires, robots.txt) à la fréquence choisie et après chaque mise en ligne. Si quelque chose change, tu es prévenu, et un audit peut repartir tout seul.",
      en: "They reread your pages (cookie banner, captcha, buttons, forms, robots.txt) at the chosen frequency and after every release. When something changes, you are told, and an audit can start on its own.",
    },
    link: { href: "/espace/automations", fr: "Automations", en: "Automations" },
    keys: "surveillance suivi monitoring veille changement alerte automatique watch track monitor change automatic",
  },
  {
    id: "frequence",
    cat: "automations",
    q: { fr: "À quelle fréquence mes pages sont-elles vérifiées ?", en: "How often are my pages checked?" },
    a: {
      fr: "Une fois par jour par défaut, réglable : toutes les heures, toutes les 6 h ou une fois par semaine. Les vérifications sont gratuites ; seul un audit relancé utilise des crédits, au plus un par page et par jour.",
      en: "Once a day by default, adjustable: every hour, every 6 h or once a week. Checks are free; only a rerun audit uses credits, one per page and per day at most.",
    },
    keys: "frequence heure jour semaine intervalle quotidien hebdomadaire frequency hourly daily weekly interval",
  },
  {
    id: "slack",
    cat: "automations",
    q: { fr: "Comment recevoir les alertes sur Slack ?", en: "How do I get alerts on Slack?" },
    a: {
      fr: "Dans Automations, clique sur « Connecter Slack » et choisis le canal : un message de test part aussitôt. Discord, n8n, Make ou Zapier : colle une URL de webhook entrant.",
      en: "In Automations, click “Connect Slack” and pick the channel: a test message goes out right away. Discord, n8n, Make or Zapier: paste an incoming webhook URL.",
    },
    link: { href: "/espace/automations", fr: "Automations", en: "Automations" },
    keys: "slack discord teams webhook zapier make n8n notification canal message alertes channel notify",
  },
  {
    id: "deploiement",
    cat: "automations",
    q: { fr: "Peut-on vérifier le site après chaque mise en ligne ?", en: "Can the site be checked after every release?" },
    a: {
      fr: "Oui. Appelle l'adresse secrète donnée dans Automations après un déploiement (Vercel, Shopify ou GitHub) : toutes les pages suivies sont vérifiées dans la minute.",
      en: "Yes. Call the secret address shown in Automations after a deployment (Vercel, Shopify or GitHub): every tracked page is checked within a minute.",
    },
    link: { href: "/espace/automations", fr: "Automations", en: "Automations" },
    keys: "deploiement mise en ligne release deploy hook vercel shopify github theme publication ci",
  },
  {
    id: "baisse-score",
    cat: "automations",
    q: { fr: "Suis-je prévenu si mon score baisse ?", en: "Am I alerted if my score drops?" },
    a: {
      fr: "Oui, avec le suivi mensuel : un audit complet tous les 30 jours, et une alerte par e-mail et sur Slack si le score baisse de plus de 5, 10 ou 20 points, selon ton réglage.",
      en: "Yes, with monthly tracking: a full audit every 30 days, and an e-mail and Slack alert if the score drops by more than 5, 10 or 20 points, as you set it.",
    },
    keys: "baisse chute regression score alerte seuil mensuel drop fall threshold monthly alert",
  },
  {
    id: "desabonner",
    cat: "automations",
    q: { fr: "Comment ne plus recevoir les e-mails d'alerte ?", en: "How do I stop alert e-mails?" },
    a: {
      fr: "Chaque e-mail d'alerte a un lien de désinscription en un clic, sans connexion. Les liens de connexion et les rapports demandés continuent d'arriver.",
      en: "Every alert e-mail has a one-click unsubscribe link, no sign-in needed. Sign-in links and reports you asked for still arrive.",
    },
    keys: "desinscription desabonner arreter spam mails trop notifications unsubscribe stop emails",
  },

  // ---------- Équipe ----------
  {
    id: "inviter",
    cat: "team",
    q: { fr: "Comment inviter un collègue ?", en: "How do I invite a colleague?" },
    a: {
      fr: "Dans Équipe, entre son adresse : il reçoit un lien valable 7 jours, réservé à cette adresse. Seul le propriétaire de l'équipe gère les membres.",
      en: "In Team, enter their address: they get a link valid for 7 days, for that address only. Only the team's owner manages members.",
    },
    link: { href: "/equipe", fr: "Équipe", en: "Team" },
    keys: "inviter ajouter membre collegue collaborateur partager acces invitation invite add member colleague access",
  },
  {
    id: "roles",
    cat: "team",
    q: { fr: "Quels sont les rôles dans une équipe ?", en: "What are the team roles?" },
    a: {
      fr: "Propriétaire : gère les membres. Admin : lance des audits, gère automations, carte et comptes de test. Lecteur : lit les rapports.",
      en: "Owner: manages members. Admin: runs audits, manages automations, card and test accounts. Viewer: reads reports.",
    },
    keys: "role roles droits permissions admin lecteur proprietaire acces rights viewer owner",
  },
  {
    id: "marque-blanche",
    cat: "team",
    q: { fr: "Puis-je mettre mon logo sur les rapports ?", en: "Can I put my logo on reports?" },
    a: {
      fr: "Oui, pour les agences : dans Équipe, ton nom et ton logo remplacent AgentProof sur les rapports de l'équipe, en ligne et en PDF.",
      en: "Yes, for agencies: in Team, your name and logo replace AgentProof on the team's reports, online and as PDF.",
    },
    link: { href: "/equipe", fr: "Équipe", en: "Team" },
    keys: "marque blanche logo agence personnaliser branding white label agency client",
  },
  {
    id: "changer-equipe",
    cat: "team",
    q: { fr: "Comment passer d'une équipe à l'autre ?", en: "How do I switch teams?" },
    a: {
      fr: "Avec le sélecteur d'équipe en haut de la barre latérale de ton espace.",
      en: "With the team switcher at the top of your space's sidebar.",
    },
    keys: "changer equipe plusieurs espaces selecteur basculer switch team spaces several",
  },

  // ---------- Données et légal ----------
  {
    id: "legal",
    cat: "data",
    q: { fr: "Est-ce légal de tester un site ?", en: "Is it legal to test a site?" },
    a: {
      fr: "L'agent visite des pages publiques comme un client : sans créer de compte, sans payer et sans contourner de protection. Si un site le bloque, la mission est notée « anti-bot » et sort du score.",
      en: "The agent visits public pages like a customer: it creates no account, never pays and bypasses no protection. If a site blocks it, the mission is marked “anti-bot” and left out of the score.",
    },
    keys: "legal legalite loi droit rgpd scraping autorise law legality gdpr allowed",
  },
  {
    id: "donnees",
    cat: "data",
    q: { fr: "Quelles données collectez-vous ?", en: "What data do you collect?" },
    a: {
      fr: "Ton e-mail, l'adresse des sites testés et les captures de l'agent. L'agent ne saisit aucune donnée personnelle sur les sites. Les données sont hébergées en Europe (Paris).",
      en: "Your e-mail, the address of the tested sites and the agent's screenshots. The agent enters no personal data on sites. Data is hosted in Europe (Paris).",
    },
    link: { href: "/confidentialite", fr: "Confidentialité", en: "Privacy" },
    keys: "donnees personnelles vie privee rgpd confidentialite hebergement stockage securite cookies privacy personal data gdpr storage hosting security",
  },
  {
    id: "cookies",
    cat: "data",
    q: { fr: "Le site utilise-t-il des traceurs ?", en: "Does the site use trackers?" },
    a: {
      fr: "Non. Seulement les cookies nécessaires au fonctionnement (session, équipe, langue) : aucun traceur, aucune publicité.",
      en: "No. Only the cookies it needs to work (session, team, language): no tracker, no advertising.",
    },
    link: { href: "/cookies", fr: "Cookies", en: "Cookies" },
    keys: "cookies traceurs tracking publicite analytics trackers advertising",
  },
  {
    id: "contact",
    cat: "data",
    q: { fr: "Comment vous contacter ?", en: "How do I contact you?" },
    a: {
      fr: `Écris à ${CONTACT}. Pour un rapport, joins son lien.`,
      en: `Write to ${CONTACT}. For a report, include its link.`,
    },
    keys: "contact support aide email question probleme joindre ecrire help reach write",
  },

  // ---------- Test de paiement ----------
  {
    id: "test-paiement",
    cat: "payment",
    q: { fr: "Qu'est-ce que le test de paiement ?", en: "What is the payment test?" },
    a: {
      fr: "Un test à part, facultatif : l'agent prend le premier article disponible et paie une seule fois avec la carte de ton équipe, en 3 à 10 minutes. Un refus « fonds insuffisants » prouve que le paiement a atteint la banque.",
      en: "A separate, optional test: the agent takes the first available item and pays once with your team's card, in 3 to 10 minutes. An “insufficient funds” decline proves the payment reached the bank.",
    },
    keys: "paiement payer carte checkout commande banque achat reel payment pay card bank order purchase",
  },
  {
    id: "carte",
    cat: "payment",
    q: { fr: "Où enregistrer la carte de l'équipe ?", en: "Where do I add the team's card?" },
    a: {
      fr: "Dans Moyen de paiement. Numéro, date et cryptogramme sont chiffrés et ne sont plus jamais affichés. Seuls le propriétaire et les admins gèrent la carte.",
      en: "In Payment method. Number, date and security code are encrypted and never shown again. Only the owner and admins manage the card.",
    },
    link: { href: "/espace/paiement", fr: "Moyen de paiement", en: "Payment method" },
    keys: "carte bancaire ajouter enregistrer cb visa moyen paiement securite chiffre card add save credit secure encrypted",
  },
  {
    id: "vraie-commande",
    cat: "payment",
    q: { fr: "Le test peut-il passer une vraie commande ?", en: "Can the test place a real order?" },
    a: {
      fr: "Oui, si la carte a des fonds. Utilise une carte virtuelle à 0 € pour ne rien acheter, et garde ton téléphone à portée pour valider le 3D Secure.",
      en: "Yes, if the card has funds. Use a virtual card at €0 to buy nothing, and keep your phone at hand to approve 3D Secure.",
    },
    keys: "vraie commande achat reel debit argent 3d secure virtuelle risque real order charged money virtual risk",
  },
  {
    id: "comptes-test",
    cat: "payment",
    q: { fr: "Et si le site exige un compte pour payer ?", en: "What if the site requires an account to pay?" },
    a: {
      fr: "Ajoute un compte de test dans Comptes de test. Le test tourne alors deux fois : sans compte, puis connecté. Les mots de passe restent dans un coffre-fort chez H Company ; l'agent ne les voit jamais.",
      en: "Add a test account in Test accounts. The test then runs twice: without an account, then signed in. Passwords stay in a vault at H Company; the agent never sees them.",
    },
    link: { href: "/espace/comptes", fr: "Comptes de test", en: "Test accounts" },
    keys: "compte test connexion identifiant mot de passe login obligatoire account password required sign in",
  },
];

// ---------- search ----------

const STOP = new Set(
  (
    "le la les un une des du de d l au aux et ou a à en dans sur pour par avec sans ce cet cette ces se sa son ses mon ma mes ton ta tes " +
    "notre nos votre vos leur leurs je tu il elle on nous vous ils elles me te y que qui quoi quel quelle quels quelles est sont etre ai as " +
    "avez ont fait faire peut peux puis pouvons comment pourquoi quand ou-est c qu s n ne pas plus tres bien alors donc mais si ca cela ceci " +
    "the a an of to in on for by with without is are be do does did can how what why when where which who it its my your our their i you we they " +
    "this that these those there here at as from or and if not no any some get someone something somebody need want have has should would could will me us please " +
    "quelqu chose faut veux voudrais veut besoin doit dois koi kwa svp stp merci bonjour"
  ).split(" "),
);

// Everyday words that mean the same thing, grouped under one concept. A query word and an answer word meet
// when they fall in the same group, so "tarif" finds "crédits" and "slak" (typo) still lands on "slack".
const SYNONYMS: string[][] = [
  ["prix", "tarif", "cout", "couter", "cher", "payant", "facture", "facturer", "price", "pricing", "cost", "expensive", "bill", "billing", "fee"],
  ["gratuit", "free", "essai", "trial"],
  ["resilier", "resiliation", "annuler", "cancel", "terminate"],
  ["credit", "jeton", "quota", "token", "solde", "balance"],
  ["abonnement", "forfait", "plan", "offre", "subscription", "upgrade"],
  ["supprimer", "effacer", "enlever", "retirer", "delete", "remove", "erase", "corbeille", "trash", "bin"],
  ["partager", "envoyer", "exporter", "telecharger", "share", "send", "export", "download", "pdf"],
  ["inviter", "invitation", "ajouter", "collegue", "membre", "collaborateur", "invite", "colleague", "member", "teammate"],
  ["equipe", "team", "organisation", "organization", "espace", "workspace", "space"],
  ["connexion", "connecter", "login", "signin", "identifier", "inscription", "inscrire", "signup", "register", "password", "motdepasse"],
  ["duree", "temps", "long", "minute", "attendre", "rapide", "lent", "time", "duration", "wait", "slow", "fast", "quick"],
  ["score", "note", "noter", "resultat", "pourcentage", "taux", "rating", "result", "percentage", "rate", "grade"],
  ["blocage", "bloquer", "probleme", "bug", "erreur", "echec", "echouer", "rater", "blocker", "blocked", "problem", "issue", "error", "fail", "failure"],
  ["corriger", "correction", "corrige", "reparer", "ameliorer", "recommandation", "fix", "fixed", "repair", "improve", "recommendation"],
  ["alerte", "notification", "prevenir", "notifier", "avertir", "alert", "notify", "warn"],
  ["slack", "discord", "webhook", "zapier", "n8n"],
  ["deploiement", "deployer", "release", "deploy", "deployment", "publication", "publier", "publish"],
  ["mobile", "telephone", "smartphone", "portable", "iphone", "android", "phone", "responsive"],
  ["concurrent", "concurrence", "comparer", "comparaison", "competitor", "competition", "compare", "comparison", "benchmark", "versus", "vs"],
  ["paiement", "payer", "carte", "cb", "visa", "banque", "bancaire", "payment", "pay", "card", "bank", "checkout"],
  ["commande", "commander", "acheter", "achat", "order", "buy", "purchase"],
  ["donnee", "rgpd", "confidentialite", "vie", "privee", "data", "privacy", "gdpr", "personnel", "personal"],
  ["legal", "legalite", "loi", "droit", "autoriser", "autorisation", "law", "legality", "allowed", "permission"],
  ["replay", "video", "enregistrement", "rejouer", "revoir", "recording", "watch"],
  ["capture", "screenshot", "image", "ecran", "screen", "preuve", "proof"],
  ["agent", "ia", "ai", "robot", "bot", "holo", "modele", "model", "llm"],
  ["mission", "scenario", "parcours", "tache", "task", "journey"],
  ["rapport", "audit", "report", "analyse", "analysis"],
  ["contact", "support", "aide", "help", "joindre", "reach", "assistance"],
  ["classement", "ranking", "leaderboard", "palmares", "top"],
  ["contester", "reclamer", "reclamation", "dispute", "contest", "complaint", "appeal"],
  ["marque", "blanche", "logo", "branding", "whitelabel"],
  ["desinscrire", "desinscription", "desabonner", "unsubscribe", "optout", "stop", "arreter"],
  ["frequence", "souvent", "heure", "quotidien", "jour", "semaine", "hebdomadaire", "often", "frequency", "hourly", "daily", "weekly"],
  ["cookie", "traceur", "tracker", "tracking", "publicite", "advertising"],
  ["captcha", "antibot", "anti", "cloudflare"],
];

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ");

// Light stemming, French and English: plural and a few frequent endings, so "corrections" meets "correction"
// and "deployed" meets "deploy". Short words are left alone.
function stem(w: string) {
  if (w.length <= 3) return w;
  for (const suf of ["ements", "ement", "ations", "ation", "ings", "ing", "ees", "es", "ed", "er", "ee", "e", "s", "x"]) {
    if (w.length - suf.length >= 4 && w.endsWith(suf)) return w.slice(0, -suf.length);
  }
  return w;
}

const CONCEPT = new Map<string, string>();
SYNONYMS.forEach((group, i) => group.forEach((w) => CONCEPT.set(stem(fold(w).replace(/ /g, "")), `#${i}`)));

const words = (s: string) =>
  fold(s)
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .map(stem);

// Damerau-Levenshtein (optimal string alignment) with an early exit: two words "match" within a small budget.
function distance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      best = Math.min(best, d[i][j]);
    }
    if (best > max) return max + 1;
  }
  return d[a.length][b.length];
}

type Doc = { faq: Faq; fields: { terms: Set<string>; weight: number }[] };

// Each question is indexed in both languages: the question weighs most, then the extra words, then the answer.
// The interface language weighs a little more than the other one.
function buildIndex(lang: Lang): Doc[] {
  const other: Lang = lang === "fr" ? "en" : "fr";
  return FAQ.map((faq) => ({
    faq,
    fields: [
      [faq.q[lang], 3],
      [faq.q[other], 2.4],
      [faq.keys ?? "", 2],
      [CATEGORIES.find((c) => c.id === faq.cat)![lang], 1],
      [faq.a[lang], 1.2],
      [faq.a[other], 0.9],
    ].map(([text, weight]) => ({ terms: expand(words(text as string)), weight: weight as number })),
  }));
}

const expand = (ws: string[]) => new Set(ws.flatMap((w) => (CONCEPT.has(w) ? [w, CONCEPT.get(w)!] : [w])));

const indexes: Partial<Record<Lang, { docs: Doc[]; vocab: string[]; df: Map<string, number> }>> = {};
function index(lang: Lang) {
  if (!indexes[lang]) {
    const docs = buildIndex(lang);
    const df = new Map<string, number>();
    for (const d of docs) for (const t of new Set(d.fields.flatMap((f) => [...f.terms]))) df.set(t, (df.get(t) ?? 0) + 1);
    indexes[lang] = { docs, vocab: [...df.keys()].filter((t) => !t.startsWith("#")), df };
  }
  return indexes[lang]!;
}

// Every index term a query word can stand for, with how sure we are: exact or synonym 1, prefix 0.85,
// one typo 0.75, two typos (long words only) 0.5.
function variants(w: string, vocab: string[]): Map<string, number> {
  const out = new Map<string, number>([[w, 1]]);
  const add = (t: string, s: number) => {
    if ((out.get(t) ?? 0) < s) out.set(t, s);
    if (CONCEPT.has(t) && (out.get(CONCEPT.get(t)!) ?? 0) < s) out.set(CONCEPT.get(t)!, s);
  };
  if (CONCEPT.has(w)) add(CONCEPT.get(w)!, 1);
  for (const t of vocab) {
    if (t === w) continue;
    if (w.length >= 3 && t.startsWith(w)) add(t, 0.85);
    else if (w.length >= 4) {
      const max = w.length >= 8 ? 2 : 1;
      const dd = distance(w, t, max);
      if (dd <= max) add(t, dd === 1 ? 0.75 : 0.5);
    }
  }
  return out;
}

export type Hit = { faq: Faq; score: number };

// Ranks every question for a free-text query. Each query word scores its best match in each field, weighted by
// the field and by how rare the matched term is; the total is scaled by the share of query words that matched,
// so "carte paiement" favours an answer about both over one about either.
export function search(query: string, lang: Lang): Hit[] {
  const qs = [...new Set(words(query))];
  if (!qs.length) return [];
  const { docs, vocab, df } = index(lang);
  const n = docs.length;
  const idf = (t: string) => Math.log(1 + n / (df.get(t) ?? n));
  const vars = qs.map((w) => variants(w, vocab));
  return docs
    .map(({ faq, fields }) => {
      let total = 0;
      let matched = 0;
      for (const v of vars) {
        let best = 0;
        for (const f of fields) for (const [t, s] of v) if (f.terms.has(t)) best = Math.max(best, s * f.weight * idf(t));
        if (best > 0) matched++;
        total += best;
      }
      const coverage = matched / qs.length;
      return { faq, score: (total / qs.length) * coverage * coverage };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);
}

// Shown when nothing matches at all, so the page never ends on an empty list.
export const POPULAR = ["tester-mon-site", "prix-audit", "calcul-score"];

// The bar under which a hit is only "close", not an answer.
export const RELEVANT = 1.6;
