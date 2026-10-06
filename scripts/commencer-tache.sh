#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
id="${1:-}"
if [[ ! "$id" =~ ^[A-Z]+-[0-9]{2}$ ]]; then
  printf 'Usage : bash scripts/commencer-tache.sh UX-03
' >&2
  exit 1
fi
branch="$(awk -F '\t' -v id="$id" 'NR>1 && $1==id {print $2}' docs/branches.tsv)"
if [[ -z "$branch" ]]; then printf 'ID inconnu : %s
' "$id" >&2; exit 1; fi
if [[ -n "$(git status --porcelain)" ]]; then
  printf 'Enregistre tes changements actuels avant de changer de tâche.
' >&2
  exit 1
fi
git fetch origin
if git show-ref --verify --quiet "refs/heads/$branch"; then
  git switch "$branch"
else
  git switch --track -c "$branch" "origin/$branch"
fi
git merge --ff-only "origin/$branch"
git merge --no-edit origin/main
printf '
Branche : %s
Fiche : docs/taches/%s.md
' "$branch" "$id"
