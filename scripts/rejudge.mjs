// Re-judges finished checkout runs with the blind judge (screenshot + mission only), from stored screenshots.
// Same verdict rules as web/lib/engine.ts. Usage: node --env-file=$HOME/.config/agentproof/.env scripts/rejudge.mjs
const { SUPABASE_URL, SUPABASE_SECRET_KEY, HF_TOKEN } = process.env;
const MODEL = process.env.HF_MODEL ?? "Qwen/Qwen3.5-9B";
const BLOCKERS = ["none", "cookie_banner", "popup", "search_failed", "filter_failed", "size_selector", "button_unresponsive", "captcha_or_bot_block", "login_required", "out_of_stock", "page_error_or_timeout", "other"];
const sb = (path, init = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}`, "Content-Type": "application/json", ...init.headers } });

async function judge(imageUrl, mission) {
  const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `${MODEL}:primeintellect`, max_tokens: 200, temperature: 0, chat_template_kwargs: { enable_thinking: false },
      messages: [{ role: "user", content: [
        { type: "text", text: `Screenshot of the last page an AI shopping agent saw on an e-commerce site. Mission: ${mission}. A checkout page asks for login, email, shipping address or payment after leaving the cart. Reply with JSON only: {"is_checkout_page": boolean, "blocking_overlay": boolean, "blocker_type": one of ${BLOCKERS.join("|")}, "reason": "short French sentence"}` },
        { type: "image_url", image_url: { url: imageUrl } },
      ] }],
    }),
  });
  if (!res.ok) throw new Error(`HF ${res.status}`);
  const out = (await res.json()).choices[0].message.content ?? "";
  return JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
}

const only = process.argv.includes("--unverified") ? "&success=is.null" : "";
const runs = await (await sb("runs?status=eq.done&screenshot_url=not.is.null" + only + "&select=id,reached_checkout,blocker_type,agent_answer,missions!inner(title,slug)&missions.slug=neq.paiement")).json();
let agree = 0, changed = 0, failed = 0;
for (const r of runs) {
  let j;
  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise((ok) => setTimeout(ok, 4000 * (attempt + 1))); // provider rate limit: stay slow
    try { j = await judge(`${SUPABASE_URL}/storage/v1/object/public/screenshots/${r.id}.png`, r.missions.title); break; }
    catch (e) { j = { error: String(e) }; }
  }
  const verified = typeof j.is_checkout_page === "boolean";
  const success = verified ? j.is_checkout_page : null;
  let blocker = success ? "none" : r.agent_answer?.blocker_type ?? "other";
  if (success === false && r.reached_checkout) blocker = j.blocker_type ?? "other";
  if (success === false && (!blocker || blocker === "none")) blocker = "other";
  if (!verified) failed++;
  else if (success === !!r.reached_checkout) agree++;
  else changed++;
  await sb(`runs?id=eq.${r.id}`, { method: "PATCH", body: JSON.stringify({ judge: j, success, blocker_type: success === null && r.reached_checkout ? null : blocker }) });
}
console.log(JSON.stringify({ runs: runs.length, judge_agrees_with_agent: agree, judge_overrules_agent: changed, unverified: failed }));
