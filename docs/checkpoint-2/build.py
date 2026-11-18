"""Génère parcours-utilisateur.svg et architecture.svg, puis les PNG (Chrome headless).
Usage : python3 docs/checkpoint-2/build.py"""
from html import escape
from pathlib import Path

DIR = Path(__file__).parent
FONT = "-apple-system, 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif"
INK, INK2, LINE, BLUE, BG = "#1d1d1f", "#6e6e73", "#d2d2d7", "#0071e3", "#f5f5f7"


def text(x, y, s, size=16, weight=400, color=INK, anchor="start"):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{color}" text-anchor="{anchor}">{escape(s)}</text>'


def lines(x, y, rows, size=14, color=INK2, gap=20, weight=400):
    return "".join(text(x, y + i * gap, r, size, weight, color) for i, r in enumerate(rows))


def card(x, y, w, h, fill="#fff", stroke=LINE, r=18, dash=False):
    d = ' stroke-dasharray="6 6"' if dash else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"{d}/>'


def arrow(x1, y1, x2, y2, color=BLUE, dash=False):
    d = ' stroke-dasharray="6 6"' if dash else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="2"{d} marker-end="url(#a{color[1:]})"/>'


def path(d, color=BLUE, dash=False):
    da = ' stroke-dasharray="6 6"' if dash else ""
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="2"{da} marker-end="url(#a{color[1:]})"/>'


def svg(w, h, body):
    marks = "".join(
        f'<marker id="a{c[1:]}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{c}"/></marker>'
        for c in (BLUE, INK2, "#34c759", "#ff9500")
    )
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" font-family="{FONT}">'
            f'<defs>{marks}</defs><rect width="{w}" height="{h}" fill="{BG}"/>{body}</svg>')


def step(x, y, n, title, rows, url, w=340, h=200, accent=BLUE):
    return (card(x, y, w, h)
            + f'<circle cx="{x + 34}" cy="{y + 36}" r="16" fill="{accent}"/>'
            + text(x + 34, y + 42, str(n), 16, 700, "#fff", "middle")
            + text(x + 62, y + 43, title, 20, 650)
            + lines(x + 24, y + 82, rows, 15, INK2, 22)
            + text(x + 24, y + h - 20, url, 13, 500, BLUE))


# ---------- Parcours utilisateur ----------
def parcours():
    W, H = 1600, 1000
    b = [text(64, 78, "AgentProof · parcours utilisateur", 34, 700),
         text(64, 112, "Du premier clic sur l'accueil au suivi mensuel. Produit en ligne : agentproof-iota-tawny.vercel.app", 17, 400, INK2)]
    # phase labels
    for x, label in [(64, "DÉCOUVRIR"), (444, "LANCER"), (824, "ATTENDRE"), (1204, "COMPRENDRE")]:
        b.append(text(x, 168, label, 13, 700, INK2))
    for x, label in [(64, "PROUVER"), (444, "PARTAGER"), (824, "SUIVRE"), (1204, "RÉSULTAT")]:
        b.append(text(x, 590, label, 13, 700, INK2))
    X = [64, 444, 824, 1204]
    y1, y2 = 186, 608
    b.append(step(X[0], y1, 1, "Accueil", ["Promesse : « un client mystère IA", "essaie d'acheter sur ton site ».", "Rapport d'exemple, classement public", "des 10 sites mode."], "/  ·  /classement"))
    b.append(step(X[1], y1, 2, "Lancer l'audit", ["Adresse du site + un concurrent", "(facultatif), e-mail du rapport,", "appareil : ordinateur ou mobile."], "formulaire « Lancer l'audit »"))
    b.append(step(X[2], y1, 3, "Rapport en direct", ["La page s'ouvre tout de suite et", "se remplit : 5 missions en cours,", "10 à 20 minutes. Rien à recharger."], "/audit/[id]"))
    b.append(step(X[3], y1, 4, "Score et blocages", ["Score = missions jusqu'au checkout.", "Comparaison concurrent, blocages", "classés par impact, plan de", "corrections écrit par un LLM."], "/audit/[id]"))
    b.append(step(X[0], y2, 5, "Preuves", ["Dernière capture de chaque mission,", "verdict du juge visuel, et replay", "étape par étape : écran, action,", "point cliqué, raisonnement."], "/replay/[run]"))
    b.append(step(X[1], y2, 6, "Partager", ["PDF du rapport, badge", "« Agent-ready » à coller sur le site,", "lien du rapport à l'équipe,", "marque blanche pour les agences."], "/badge/[id].svg  ·  PDF"))
    b.append(step(X[2], y2, 7, "Suivre", ["Espace › Automations : surveillance", "quotidienne de la page, audit tous", "les 30 jours, alerte si le score", "baisse de 10 points ou plus."], "/espace/automations"))
    b.append(card(X[3], y2, 340, 200, "#e8f2fd", "#b6d4f7")
             + text(X[3] + 24, y2 + 44, "Le marchand sait", 22, 700)
             + lines(X[3] + 24, y2 + 80, ["si un agent IA peut acheter chez lui,", "où il bloque, preuves à l'appui,", "quoi corriger en premier,", "et s'il fait mieux que son concurrent."], 15, INK, 22))
    # arrows row 1 and row 2
    for i in range(3):
        b.append(arrow(X[i] + 342, y1 + 100, X[i + 1] - 4, y1 + 100))
        b.append(arrow(X[i] + 342, y2 + 100, X[i + 1] - 4, y2 + 100))
    # wrap from 4 to 5
    b.append(path(f"M {X[3] + 170} {y1 + 202} V 560 Q {X[3] + 170} 548 {X[3] + 158} 548 H {X[0] + 182} Q {X[0] + 170} 548 {X[0] + 170} 560 V {y2 - 4}"))
    # side branches under row 1
    yb = 410
    b.append(card(X[1], yb, 340, 110, "#fff", LINE, 14, True)
             + text(X[1] + 20, yb + 30, "Pas encore connecté ?", 15, 650)
             + lines(X[1] + 20, yb + 54, ["Lien de connexion par e-mail, sans mot", "de passe. Le formulaire revient rempli."], 14, INK2, 20))
    b.append(arrow(X[1] + 170, y1 + 202, X[1] + 170, yb - 4, INK2, True))
    b.append(card(X[2], yb, 340, 110, "#fff", LINE, 14, True)
             + text(X[2] + 20, yb + 30, "En coulisses", 15, 650)
             + lines(X[2] + 20, yb + 54, ["L'agent Holo (H Company) joue chaque", "mission, un juge Hugging Face relit la", "dernière capture à l'aveugle."], 14, INK2, 20))
    b.append(arrow(X[2] + 170, y1 + 202, X[2] + 170, yb - 4, INK2, True))
    b.append(text(X[0], yb + 30, "Site déjà audité par l'équipe", 15, 650)
             + lines(X[0], yb + 54, ["ces 7 derniers jours : on arrive", "directement sur le rapport existant,", "sans nouvel audit ni crédit dépensé."], 14, INK2, 20))
    b.append(text(64, 960, "Règle de l'agent : il s'arrête à la première page du checkout. Jamais de paiement, de compte créé, de donnée personnelle ni de captcha résolu.", 15, 400, INK2))
    return svg(W, H, "".join(b))


# ---------- Architecture ----------
def box(x, y, w, h, title, sub, rows, color):
    return (card(x, y, w, h, "#fff", color, 18)
            + f'<rect x="{x}" y="{y}" width="8" height="{h}" rx="4" fill="{color}"/>'
            + text(x + 28, y + 38, title, 20, 700)
            + text(x + 28, y + 62, sub, 14, 500, color)
            + lines(x + 28, y + 92, rows, 14, INK2, 21))


def label(x, y, s, anchor="middle"):
    return text(x, y, s, 13, 500, INK2, anchor)


def architecture():
    W, H = 1600, 1000
    VERCEL, SUPA, HCO, HF, N8N, GH = "#1d1d1f", "#3ecf8e", "#0071e3", "#ff9d00", "#ea4b71", "#6e6e73"
    b = [text(64, 78, "AgentProof · architecture technique", 34, 700),
         text(64, 112, "Ce qui tourne en production aujourd'hui (main, 18 nov 2026).", 17, 400, INK2)]
    # user
    b.append(box(64, 170, 300, 170, "Marchand / agence", "navigateur", ["Accueil, formulaire d'audit,", "rapport, replay, classement,", "espace d'équipe, PDF, badge."], GH))
    # next.js app
    ax, ay, aw, ah = 470, 150, 620, 400
    b.append(card(ax, ay, aw, ah, "#fff", VERCEL, 22))
    b.append(text(ax + 28, ay + 42, "App web Next.js 16 sur Vercel", 22, 700))
    b.append(text(ax + 28, ay + 66, "React + Tailwind · routes API · moteur d'audit (web/lib/engine.ts)", 14, 500, INK2))
    inner = [
        (ax + 28, ay + 92, "Pages", ["/, /audit/[id], /replay/[run],", "/classement, /methode, /espace/*"]),
        (ax + 318, ay + 92, "Routes API", ["/api/audits : crée audit + runs", "/api/auth : lien e-mail, cookie signé"]),
        (ax + 28, ay + 226, "/api/tick, chaque minute", ["≤ 5 requêtes H par tick, 3 sessions", "lance, vérifie, rejoue, clôt l'audit"]),
        (ax + 318, ay + 226, "Garde-fous", ["juge à l'aveugle, rejeu des échecs,", "réserve de tokens, 6 audits/h/IP"]),
    ]
    for x, y, t, rows in inner:
        b.append(card(x, y, 274, 116, BG, BG, 14) + text(x + 18, y + 32, t, 16, 650) + lines(x + 18, y + 58, rows, 13.5, INK2, 20))
    b.append(text(ax + 28, ay + 378, "Contrôle statique gratuit (robots.txt, schema.org, anti-bot) · surveillance via Jina Reader", 13, 500, INK2))
    # supabase
    b.append(box(1196, 170, 340, 190, "Supabase", "Postgres + Storage (eu-west-3)", ["sites, missions, audits, runs,", "équipes, automations, favoris", "vue site_scores (classement)", "bucket public « screenshots »"], SUPA))
    # H company
    b.append(box(470, 640, 380, 220, "H Company Agents API", "agp.eu.hcompany.ai", ["agent « agentproof-shopper »", "modèles holo4-35b-a3b (rapide)", "et holo4-27b (précis)", "navigateur cloud 1024×640 / 390×844", "événements, captures, replay partagé"], HCO))
    # HF
    b.append(box(900, 640, 360, 220, "Hugging Face", "Inference Providers + Hub", ["Qwen/Qwen3.5-9B :", "· juge visuel sur la capture", "· plan de corrections", "Dataset public des runs", "georgesdoxuan/agentproof-runs"], HF))
    # n8n
    b.append(box(64, 420, 300, 190, "n8n (VPS)", "ordonnanceur + messages", ["appelle /api/tick chaque minute", "e-mails de connexion,", "d'invitation et d'alerte", "Telegram : audit terminé"], N8N))
    # github
    b.append(box(64, 690, 300, 170, "GitHub", "repo + GitHub Actions", ["push sur main : déploiement", "Vercel production (CLI)", "scripts/export-hf.sh vers le Hub"], GH))
    # arrows
    b.append(arrow(366, 240, ax - 4, 240))
    b.append(label(418, 230, "HTTPS"))
    b.append(arrow(ax + aw + 2, 250, 1192, 250, INK2))
    b.append(label(1143, 240, "lit / écrit"))
    b.append(arrow(366, 500, ax - 4, 440, INK2))
    b.append(label(410, 455, "tick"))
    b.append(arrow(ax - 4, 470, 368, 540, INK2, True))
    b.append(label(380, 565, "webhooks", "start"))
    b.append(arrow(366, 770, ax - 4, 560, INK2, True))
    b.append(label(398, 735, "déploie", "start"))
    b.append(arrow(660, ay + ah + 2, 660, 636))
    b.append(label(665, 600, "lance / suit les sessions", "start"))
    b.append(arrow(1080, ay + ah + 2, 1080, 636, "#ff9500"))
    b.append(label(1088, 600, "capture + mission", "start"))
    b.append(path("M 1260 750 H 1366 V 364", INK2, True))
    b.append(label(1376, 560, "export dataset", "start"))
    # flow footer
    b.append(card(64, 900, 1472, 64, "#fff", LINE, 14))
    b.append(text(88, 939, "Flux d'un run :  formulaire  →  run « todo »  →  tick lance la session H  →  l'agent joue la mission  →  tick lit les événements (réponse, coût, capture)  →  juge HF  →  score  →  plan de corrections", 15, 500, INK))
    return svg(W, H, "".join(b))


def main():
    out = {"parcours-utilisateur": parcours(), "architecture": architecture()}
    for name, s in out.items():
        (DIR / f"{name}.svg").write_text(s, encoding="utf-8")
    import subprocess  # PNG 2x via Chrome headless (macOS)
    chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    for name in out:
        subprocess.run([chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
                        "--window-size=1600,1000", f"--screenshot={DIR.resolve() / (name + '.png')}",
                        (DIR / f"{name}.svg").resolve().as_uri()], check=True, capture_output=True)

if __name__ == "__main__":
    main()
