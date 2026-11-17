#!/bin/bash
# Publishes finished audit runs (no personal data, no real payment tests) as a Hugging Face dataset.
# Needs SUPABASE_URL, SUPABASE_SECRET_KEY in ~/.config/agentproof/.env and `hf` logged in.
set -euo pipefail
set -a; . "$HOME/.config/agentproof/.env"; set +a
REPO="${1:-georgesdoxuan/agentproof-runs}"
OUT="$(mktemp -d)"
COLS="id,success,reached_checkout,blocker_type,blocker_detail,final_url,screenshot_url,steps,duration_s,cost_usd,input_tokens,output_tokens,finished_at,missions!inner(slug,title),audits(device,sites(domain))"
curl -sf "$SUPABASE_URL/rest/v1/runs?status=eq.done&missions.slug=neq.paiement&select=$COLS" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "
import json, sys
for r in json.load(sys.stdin):
    r['mission'] = r.pop('missions')['slug']
    a = r.pop('audits'); r['device'] = a['device']; r['site'] = a['sites']['domain']
    print(json.dumps(r, ensure_ascii=False))
" > "$OUT/runs.jsonl"
cat > "$OUT/README.md" <<'MD'
---
license: cc-by-4.0
pretty_name: AgentProof runs
---
# AgentProof runs

Each row is one mission run by an AI shopping agent (H Company Holo, Agents API) on a French fashion e-commerce site,
stopping at the first checkout page. `success` = the agent reached checkout and a visual judge (Qwen3.5-9B on Hugging Face) confirmed it.
Source: https://github.com/georgesdoxuan/AgentProof
MD
hf repos create "$REPO" --repo-type dataset --public --exist-ok >/dev/null
hf upload "$REPO" "$OUT" . --repo-type dataset --commit-message "Update runs"
echo "https://huggingface.co/datasets/$REPO ($(wc -l < "$OUT/runs.jsonl") runs)"
