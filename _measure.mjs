import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const env = readFileSync(".env.local", "utf8");
const get = (k) => env.split("\n").find((l) => l.startsWith(k + "=")).slice(k.length + 1).trim().replace(/^["']|["']$/g, "");
const BASE = process.env.MEASURE_BASE ?? "http://localhost:3001";
const CYCLES = Number(process.env.MEASURE_CYCLES ?? 12);
const admin = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const db = new pg.Client({ connectionString: get("SUPABASE_DB_URL"), ssl: { rejectUnauthorized: false } });
await db.connect();

const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };
const email = `measure_${Date.now()}@verbly.test`;
const u = await admin.auth.admin.createUser({ email, password: "Sm0ke-Test-Pw!", email_confirm: true, user_metadata: { account_type: "caregiver", role: "primary", full_name: "Measure" } });
const uid = u.data.user.id;
const jar = new Map();
const ssr = createServerClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
  cookies: { getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })), setAll: (cs) => cs.forEach(({ name, value }) => jar.set(name, value)) },
});
const si = await ssr.auth.signInWithPassword({ email, password: "Sm0ke-Test-Pw!" });
const userClient = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("NEXT_PUBLIC_SUPABASE_ANON_KEY"), { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${si.data.session.access_token}` } } });
const cookie = () => [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");
writeFileSync("/tmp/verbly-measure-cookie.txt", cookie());

const p1 = (await db.query(`select id from curriculum_content.phases where phase_number=1 order by content_version desc limit 1;`)).rows[0].id;
const childId = (await db.query(`insert into public.children (primary_caregiver_id, name, dob, age_bracket, current_phase_id) values ($1,'Measure Kid','2022-01-01','3-7',$2) returning id;`, [uid, p1])).rows[0].id;
const sess = (await db.query(`select id, (content_json->'checkin'->>'count')::int as cnt from curriculum_content.sessions where phase_number=1 and session_number=1 and age_bracket is null limit 1;`)).rows[0];
const half = Math.ceil(sess.cnt / 2);
appendFileSync("/tmp/verbly-measure-cookie.txt", `\n${childId}\n${sess.id}`);

async function timed(path, init) {
  const t0 = performance.now();
  const res = await fetch(BASE + path, { ...init, headers: { "Content-Type": "application/json", Cookie: cookie(), ...(init?.headers ?? {}) } });
  const buf = Buffer.from(await res.arrayBuffer());
  return { ms: performance.now() - t0, bytes: buf.length, status: res.status, body: buf };
}

const startMs = [], completeMs = [], startBytes = [], completeBytes = [];
// warm-up (exclude first-hit route init)
await timed("/api/sessions/start", { method: "POST", body: JSON.stringify({ child_id: childId, session_id: sess.id }) }).then(async (w) => {
  const id = JSON.parse(w.body).session_instance_id;
  for (let k = 0; k < half; k++) await userClient.from("session_checkins").insert({ session_instance_id: id, interval_index: k, response_category: "Independent", credit_value: 75 });
  await timed("/api/sessions/complete", { method: "POST", body: JSON.stringify({ session_instance_id: id }) });
});
for (let i = 0; i < CYCLES; i++) {
  const s = await timed("/api/sessions/start", { method: "POST", body: JSON.stringify({ child_id: childId, session_id: sess.id }) });
  const instId = JSON.parse(s.body).session_instance_id;
  startMs.push(s.ms); startBytes.push(s.bytes);
  for (let k = 0; k < half; k++) await userClient.from("session_checkins").insert({ session_instance_id: instId, interval_index: k, response_category: "Prompted", credit_value: 50 });
  const c = await timed("/api/sessions/complete", { method: "POST", body: JSON.stringify({ session_instance_id: instId }) });
  completeMs.push(c.ms); completeBytes.push(c.bytes);
}
// One check-in sync measured at the REST layer (what the runner actually sends).
const inst = (await db.query(`select id from public.session_instances where child_id=$1 limit 1;`, [childId])).rows[0].id;
const ckBody = JSON.stringify({ session_instance_id: inst, interval_index: 99, response_category: "Independent", credit_value: 100 });
const t0 = performance.now();
const ckRes = await fetch(`${get("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/session_checkins`, { method: "POST", headers: { "Content-Type": "application/json", apikey: get("NEXT_PUBLIC_SUPABASE_ANON_KEY"), Authorization: `Bearer ${si.data.session.access_token}`, Prefer: "return=minimal" }, body: ckBody });
const ckMs = performance.now() - t0;
const ckRespBytes = Buffer.from(await ckRes.arrayBuffer()).length;

// Compass start + score (one full pass).
const child2 = (await db.query(`insert into public.children (primary_caregiver_id, name, dob, age_bracket) values ($1,'Measure Kid C','2022-01-01','3-7') returning id;`, [uid])).rows[0].id;
const cs = await timed("/api/compass/start", { method: "POST", body: JSON.stringify({ child_id: child2 }) });
const startPayload = JSON.parse(cs.body);
const responses = {}; for (const it of startPayload.items) responses[it.id] = Object.keys(it.points)[2] ?? Object.keys(it.points)[0];
const rfa = {}; for (const f of startPayload.red_flags) if (f.code !== "free_text_concern") rfa[f.code] = false;
const scoreBody = JSON.stringify({ responses, redFlagAnswers: rfa, secondAdultAvailable: "usually", freeTextConcern: false });
const sc = await timed(`/api/compass/${startPayload.assessment_id}/score`, { method: "POST", body: scoreBody });

const out = {
  base: BASE, cycles: CYCLES, planned_checkins: sess.cnt, checkins_recorded_per_session: half,
  start:    { p50_ms: +pct(startMs, 50).toFixed(1),    p95_ms: +pct(startMs, 95).toFixed(1),    bytes: Math.round(startBytes.reduce((a,b)=>a+b,0)/startBytes.length) },
  complete: { p50_ms: +pct(completeMs, 50).toFixed(1), p95_ms: +pct(completeMs, 95).toFixed(1), bytes: Math.round(completeBytes.reduce((a,b)=>a+b,0)/completeBytes.length) },
  checkin_sync: { ms: +ckMs.toFixed(1), request_bytes: Buffer.byteLength(ckBody), response_bytes: ckRespBytes, status: ckRes.status },
  compass_start: { ms: +cs.ms.toFixed(1), bytes: cs.bytes },
  compass_score: { ms: +sc.ms.toFixed(1), request_bytes: Buffer.byteLength(scoreBody), bytes: sc.bytes, status: sc.status },
};
console.log(JSON.stringify(out, null, 2));
writeFileSync(process.env.MEASURE_OUT ?? "docs/measurements/latency-local.json", JSON.stringify(out, null, 2));
// keep the user for Lighthouse (cookie file) — cleanup happens in a later step
appendFileSync("/tmp/verbly-measure-cookie.txt", `\n${uid}`);
await db.end();
