import { getLang } from "@/lib/lang";
import { LegalPage, Mail, Section, Table, Val } from "../legal";

export async function generateMetadata() {
  return { title: `${(await getLang()) === "en" ? "Credits and accessibility" : "Crédits et accessibilité"} · AgentProof` };
}

// Rights on everything the site shows, and the accessibility statement. Add a row for every new font, image or model.
export default async function Credits() {
  const lang = await getLang();
  const en = lang === "en";
  const v = (x: string | null) => <Val v={x} lang={lang} />;
  const rows = en
    ? [
        ["Fonts", "None shipped: the site uses the system font of your device (San Francisco on Apple devices, Segoe UI on Windows…)", "Licensed with your operating system"],
        ["Logo and icons", "Drawn by the AgentProof team in SVG, in the outline style of Apple’s system icons, without copying them", "AgentProof"],
        ["Screenshots and replays", "Taken by the AI agent on public e-commerce sites, shown as evidence of a test", "The tested sites remain owners of their pages"],
        ["Brand logos in reports", "Added by each team for its own white-label reports", "The team that adds them"],
        ["AI agent", "Holo, by H Company", "H Company terms of use"],
        ["Visual judge and fix plan", "Open-source models through Hugging Face", "Licence of each model"],
        ["Code", "Next.js, React, Tailwind CSS, Supabase", "Open-source licences (MIT, Apache 2.0)"],
      ]
    : [
        ["Polices", "Aucune livrée : le site utilise la police système de ton appareil (San Francisco sur Apple, Segoe UI sur Windows…)", "Sous licence avec ton système d’exploitation"],
        ["Logo et icônes", "Dessinés par l’équipe AgentProof en SVG, dans le style des icônes système d’Apple, sans les copier", "AgentProof"],
        ["Captures et replays", "Prises par l’agent IA sur des sites e-commerce publics, affichées comme preuve d’un test", "Les sites testés restent propriétaires de leurs pages"],
        ["Logos de marque dans les rapports", "Ajoutés par chaque équipe pour ses propres rapports en marque blanche", "L’équipe qui les ajoute"],
        ["Agent IA", "Holo, de H Company", "Conditions d’utilisation de H Company"],
        ["Juge visuel et plan de corrections", "Modèles open source via Hugging Face", "Licence de chaque modèle"],
        ["Code", "Next.js, React, Tailwind CSS, Supabase", "Licences open source (MIT, Apache 2.0)"],
      ];
  return (
    <LegalPage lang={lang} path="/credits" title={en ? "Credits and accessibility." : "Crédits et accessibilité."}>
      <Section title={en ? "Credits" : "Crédits"}>
        <Table head={en ? ["Element", "Source", "Rights"] : ["Élément", "Source", "Droits"]} rows={rows} />
      </Section>
      <Section title={en ? "Accessibility" : "Accessibilité"}>
        <p>
          {en
            ? "We aim for the WCAG 2.2 AA level: text contrast of at least 4.5:1 in light and dark mode, every image described or marked as decorative, the whole site usable with the keyboard with a visible focus, a “Skip to content” link, and system settings respected (dark mode, reduced motion, increased contrast, reduced transparency)."
            : "Nous visons le niveau WCAG 2.2 AA : contraste du texte d’au moins 4,5:1 en mode clair et sombre, chaque image décrite ou marquée comme décorative, tout le site utilisable au clavier avec un focus visible, un lien « Aller au contenu », et les réglages système respectés (mode sombre, animations réduites, contraste augmenté, transparence réduite)."}
        </p>
        <p>
          {en ? "Compliance status (RGAA audit by an independent auditor): " : "État de conformité (audit RGAA par un auditeur indépendant) : "}
          {v(null)}.{" "}
          {en ? "Known limit: screenshots of tested sites are images; their description says which mission and which step they show." : "Limite connue : les captures des sites testés sont des images ; leur description dit quelle mission et quelle étape elles montrent."}
        </p>
        <p>
          {en ? "A barrier on the site? Write to " : "Un obstacle sur le site ? Écris à "}
          <Mail />
          {en ? ", we answer and fix it." : ", nous te répondons et le corrigeons."}
        </p>
      </Section>
    </LegalPage>
  );
}
