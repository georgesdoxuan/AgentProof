// Interface languages. Pure data, safe to import from client components; reading the choice lives in lib/lang.ts.
// French is the default. Only the app chrome (header, footer, team space menu, account page) is translated so far.
export const LANGS = ["fr", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "fr";
export const LANG_COOKIE = "ap_lang";
export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);

// Each language names itself, so anyone can find theirs whatever the current language.
export const LANG_NAME: Record<Lang, string> = { fr: "Français", en: "English" };

const fr = {
  skip: "Aller au contenu",
  navLabel: "Navigation principale",
  home: "AgentProof, accueil",
  nav: { ranking: "Classement", mySpace: "Mon espace", space: "Espace", signIn: "Connexion", test: "Tester", testMySite: "mon site" },
  footer: {
    rules: "Pendant un audit, l'agent ne paie jamais, ne saisit aucune donnée personnelle et ne résout aucun captcha. Il s'arrête à la première page du checkout.",
    event: "AgentProof · Hackathon H Company × Hugging Face, novembre 2026.",
    credits: "Agent : Holo, H Company. Juge visuel : Hugging Face.",
    method: "Méthode",
    privacy: "Confidentialité et mentions légales",
  },
  space: {
    label: "Espace",
    switchTeam: "Changer d'équipe",
    back: "Page précédente",
    forward: "Page suivante",
    sections: {
      "/espace": "Accueil",
      "/espace/sites": "Mes sites",
      "/espace/rapports": "Rapports",
      "/espace/paiement": "Paiement",
      "/espace/comptes": "Comptes de test",
      "/espace/automations": "Automations",
      "/espace/classement": "Classement",
      "/equipe": "Équipe",
      "/compte": "Compte",
    },
  },
  roles: { owner: "Propriétaire", admin: "Admin", viewer: "Lecteur" },
  account: {
    title: "Compte",
    loginNote: "Connexion par lien e-mail, sans mot de passe.",
    teams: (n: number) => `${n} équipe${n > 1 ? "s" : ""}`,
    myTeams: "Mes équipes",
    openTeam: "Équipe ouverte",
    open: "Ouvrir",
    createTitle: "Créer une équipe",
    createNote: "Tu en deviens propriétaire et tu y invites qui tu veux.",
    createField: "Nom de la nouvelle équipe",
    create: "Créer",
    language: "Langue",
    languageNote: "La langue de l'interface, retenue sur ce navigateur. Les rapports d'audit restent en français pour l'instant.",
    signOut: "Se déconnecter",
  },
};

export type Dict = typeof fr;

const en: Dict = {
  skip: "Skip to content",
  navLabel: "Main navigation",
  home: "AgentProof, home",
  nav: { ranking: "Ranking", mySpace: "My space", space: "Space", signIn: "Sign in", test: "Test", testMySite: "my site" },
  footer: {
    rules: "During an audit, the agent never pays, never enters personal data and never solves a captcha. It stops at the first checkout page.",
    event: "AgentProof · H Company × Hugging Face hackathon, November 2026.",
    credits: "Agent: Holo, H Company. Visual judge: Hugging Face.",
    method: "Method",
    privacy: "Privacy and legal notice",
  },
  space: {
    label: "Space",
    switchTeam: "Switch team",
    back: "Previous page",
    forward: "Next page",
    sections: {
      "/espace": "Home",
      "/espace/sites": "My sites",
      "/espace/rapports": "Reports",
      "/espace/paiement": "Payment",
      "/espace/comptes": "Test accounts",
      "/espace/automations": "Automations",
      "/espace/classement": "Ranking",
      "/equipe": "Team",
      "/compte": "Account",
    },
  },
  roles: { owner: "Owner", admin: "Admin", viewer: "Viewer" },
  account: {
    title: "Account",
    loginNote: "Sign in with an e-mail link, no password.",
    teams: (n: number) => `${n} team${n > 1 ? "s" : ""}`,
    myTeams: "My teams",
    openTeam: "Current team",
    open: "Open",
    createTitle: "Create a team",
    createNote: "You become its owner and invite whoever you like.",
    createField: "Name of the new team",
    create: "Create",
    language: "Language",
    languageNote: "The interface language, remembered on this browser. Audit reports stay in French for now.",
    signOut: "Sign out",
  },
};

export const DICTS: Record<Lang, Dict> = { fr, en };
export const dict = (lang: Lang) => DICTS[lang];
