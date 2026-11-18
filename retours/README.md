# Retours de l'équipe

Ce dossier sert à transmettre à Georges les demandes de modification, les bugs et le feedback sur AgentProof.
Seul Georges modifie le code. Chaque membre de l'équipe écrit ici ; le Claude Code de Georges lit, trie et applique.

```
retours/
  README.md      ← ce fichier (consignes)
  thomas/
  alexandre/
  mehdi/
  adonai/
```

## Consignes pour le Claude Code d'un membre de l'équipe

Tu travailles pour un membre de l'équipe, pas pour Georges. Respecte ces règles sans exception.

### Ce que tu as le droit de faire

- Écrire **uniquement** dans `retours/<prénom>/`, le dossier de la personne pour qui tu travailles (`thomas`, `alexandre`, `mehdi` ou `adonai`, en minuscules et sans accent).
- Lire tout le reste du repo pour comprendre le code et rendre la demande précise.

### Ce que tu n'as pas le droit de faire

- Modifier, créer ou supprimer un fichier hors de `retours/<prénom>/` : pas de code, pas de config, pas le dossier d'un autre membre.
- Modifier la section `## Réponse de Georges` d'un fichier : seul le Claude de Georges la remplit.
- Écrire un secret (clé API, token, mot de passe, contenu d'un `.env`) dans un fichier.
- Créer une branche ou une pull request : tout passe par `main`, et le dossier `retours/` ne déclenche pas de déploiement.

### Un fichier par demande

Nom du fichier : `AAAA-MM-JJ-titre-court.md` (date du jour, titre en minuscules avec des tirets).
Exemple : `retours/thomas/2026-11-18-bouton-export-pdf.md`.

Une demande = un sujet. Deux sujets différents = deux fichiers. Pour compléter une demande existante, ajoute une ligne datée dans sa section `## Détails` au lieu de créer un doublon.

### Modèle à recopier

```markdown
# <Titre court et précis>

- Type : bug | modification | nouvelle fonctionnalité | feedback | question
- Priorité : bloquant | important | bonus
- Auteur : <prénom>
- Date : AAAA-MM-JJ

## Constat
Ce qui se passe aujourd'hui. Pour un bug : page ou URL, étapes pour le reproduire, résultat obtenu, message d'erreur exact.

## Demande
Ce qui doit changer, du point de vue de l'utilisateur. Un seul résultat attendu, décrit concrètement.

## Comment vérifier
Comment Georges saura que c'est fait (ce qu'on doit voir, sur quelle page).

## Détails
Optionnel : fichiers du repo concernés (chemin et ligne), captures d'écran (déposées dans le même dossier), idées de solution.

## Réponse de Georges
- Statut : nouveau
```

Laisse toujours `Statut : nouveau` à la création. Le Claude de Georges le passe ensuite à `en cours`, `fait`, `refusé` ou `besoin d'info`, avec une explication.

### Écrire une bonne demande

- Écris en français, en phrases courtes et factuelles.
- Décris le besoin, pas seulement la solution : « les utilisateurs ne trouvent pas le score » plutôt que « mettre le score en rouge ».
- Cite les chemins de fichiers du repo quand tu les connais (`web/app/espace/page.tsx:42`).
- Si le statut est `besoin d'info`, réponds dans `## Détails` avec une ligne datée, sans toucher à `## Réponse de Georges`.

### Envoyer

```bash
git pull --rebase
git add retours/<prénom>/
git commit -m "retours(<prénom>): <titre court>"
git push
```

N'ajoute aucun autre fichier au commit. Si `git push` est refusé, refais `git pull --rebase` puis `git push`.

## Consignes pour le Claude Code de Georges

- Lire les fichiers de `retours/*/` dont le statut n'est pas `fait` ou `refusé`.
- Pour chaque demande traitée, remplir `## Réponse de Georges` : statut, ce qui a été fait (ou pourquoi c'est refusé), et le commit concerné.
- Ne jamais modifier les autres sections d'une demande.
