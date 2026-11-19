import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Every setting is a tab of Réglages. Old addresses (bookmarks, e-mails, Slack) keep working; the query string follows.
  async redirects() {
    const moved = { "/equipe": "equipe", "/compte": "compte", "/espace/abonnement": "abonnement", "/espace/paiement": "paiement", "/espace/comptes": "comptes" };
    return [
      // Automations left Réglages for its own sidebar entry (19/11/2026).
      { source: "/espace/reglages/automations", destination: "/espace/automations", permanent: false },
      { source: "/espace/reglages", destination: "/espace/reglages/equipe", permanent: false },
      // The trash moved from the sidebar (Sites › Corbeille, Rapports › Corbeille) to Réglages › Corbeille.
      { source: "/espace/reglages/corbeille", destination: "/espace/reglages/corbeille/sites", permanent: false },
      { source: "/espace/sites/corbeille", destination: "/espace/reglages/corbeille/sites", permanent: true },
      { source: "/espace/rapports/corbeille", destination: "/espace/reglages/corbeille/rapports", permanent: true },
      ...Object.entries(moved).map(([source, tab]) => ({ source, destination: `/espace/reglages/${tab}`, permanent: true })),
    ];
  },
  experimental: {
    // Client cache for pages already visited: going back to a section within 30 s shows it at once, with no new
    // server round trip. Forms post to /api and reload the page, and AutoRefresh calls router.refresh(), so neither
    // ever shows a stale copy.
    staleTimes: { dynamic: 30 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
