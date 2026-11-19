// Legal identity shown on the legal pages (/mentions-legales, /confidentialite, /conditions, /remboursements, /cookies, /credits). Change here only.
// A value set to TODO is shown on the site as a visible "à compléter" mark: never replace it with a guess.
// These texts are a template written by the team, to be reviewed by a lawyer before any commercial launch.
export const TODO = null;

export const LEGAL = {
  publisher: "Georges Do Xuan", // responsable de la publication et du traitement
  project: "AgentProof, projet étudiant réalisé au hackathon H Company × Hugging Face (Eugenia School, novembre 2026)",
  contact: "gdo@eugeniaschool.com",
  host: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com)",
  updated: "19 novembre 2026",
  // Publisher identity required by the LCEN (art. 6-III) once AgentProof is sold.
  company: TODO as string | null, // raison sociale et forme juridique (ex. SAS AgentProof)
  capital: TODO as string | null, // capital social
  address: TODO as string | null, // adresse du siège
  siret: TODO as string | null, // RCS / SIRET
  vat: TODO as string | null, // n° de TVA intracommunautaire
  phone: TODO as string | null, // téléphone de contact
  dpo: TODO as string | null, // contact DPO ou référent données, si différent du contact
  mediator: TODO as string | null, // médiateur de la consommation (seulement si vente à des particuliers)
  // Retention periods (RGPD art. 5-1-e): decided by the team, never guessed.
  retention: {
    account: TODO as string | null, // compte et équipe après la dernière connexion
    audits: TODO as string | null, // rapports, captures et replays
    logs: TODO as string | null, // empreinte IP et jetons de connexion
    billing: TODO as string | null, // pièces comptables (10 ans en France, à confirmer)
  },
  minAge: 16, // âge minimum pour créer un compte (consentement numérique, France : 15 ans ; 16 retenu, à valider)
};

// English wording of the same identity, for the English interface.
export const LEGAL_EN = {
  project: "AgentProof, a student project built at the H Company × Hugging Face hackathon (Eugenia School, November 2026)",
  host: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, United States (vercel.com)",
  updated: "19 November 2026",
};

// Every page of the legal set, in footer order.
export const LEGAL_PAGES: { href: string; fr: string; en: string }[] = [
  { href: "/mentions-legales", fr: "Mentions légales", en: "Legal notice" },
  { href: "/confidentialite", fr: "Confidentialité", en: "Privacy" },
  { href: "/conditions", fr: "Conditions", en: "Terms" },
  { href: "/remboursements", fr: "Remboursements", en: "Refunds" },
  { href: "/cookies", fr: "Cookies", en: "Cookies" },
  { href: "/credits", fr: "Crédits et accessibilité", en: "Credits and accessibility" },
];
