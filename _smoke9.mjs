import { readFileSync } from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const env = readFileSync(".env.local", "utf8");
const get = (k) => env.split("\n").find((l) => l.startsWith(k + "=")).slice(k.length + 1).trim().replace(/^["']|["']$/g, "");
const BASE = "http://localhost:3001";
const admin = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const db = new pg.Client({ connectionString: get("SUPABASE_DB_URL"), ssl: { rejectUnauthorized: false } });
await db.connect();
let pass = 0, fail = 0, uid;
const ok = (n, c, d) => { console.log(`${c ? "✅" : "❌"} ${n}${d ? " :: " + d : ""}`); c ? pass++ : fail++; };

try {
  const email = `smoke9_${Date.now()}@verbly.test`;
  const u = await admin.auth.admin.createUser({ email, password: "Sm0ke-Test-Pw!", email_confirm: true, user_metadata: { account_type: "caregiver", role: "primary", full_name: "Half Tester" } });
  uid = u.data.user.id;
  const jar = new Map();
  const ssr = createServerClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: { getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })), setAll: (cs) => cs.forEach(({ name, value }) => jar.set(name, value)) },
  });
  const si = await ssr.auth.signInWithPassword({ email, password: "Sm0ke-Test-Pw!" });
  const userClient = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("NEXT_PUBLIC_SUPABASE_ANON_KEY"), { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${si.data.session.access_token}` } } });
  const cookie = () => [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");

  const p1 = (await db.query(`select id from curriculum_content.phases where phase_number=1 order by content_version desc limit 1;`)).rows[0].id;
  const childId = (await db.query(`insert into public.children (primary_caregiver_id, name, dob, age_bracket, current_phase_id) values ($1,'Half Kid','2022-01-01','3-7',$2) returning id;`, [uid, p1])).rows[0].id;
  const sess = (await db.query(`select id, (content_json->'checkin'->>'count')::int as count from curriculum_content.sessions where phase_number=1 and session_number=1 and age_bracket is null limit 1;`)).rows[0];
  const min = Math.ceil(sess.count / 2);
  const inst = (await db.query(`insert into public.session_instances (child_id, session_id, content_version, ran_by_caregiver_id, age_bracket, ran_simplified) values ($1,$2,1,$3,'3-7',false) returning id;`, [childId, sess.id, uid])).rows[0].id;

  await userClient.from("session_checkins").insert({ session_instance_id: inst, interval_index: 0, response_category: "Independent", credit_value: 100 });
  const early = await fetch(`${BASE}/api/sessions/complete`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie() }, body: JSON.stringify({ session_instance_id: inst }) });
  const earlyBody = await early.json();
  ok(`one check-in cannot score a ${sess.count}-check-in session (422)`, early.status === 422 && earlyBody.code === "insufficient_checkins", `${early.status} ${earlyBody.code ?? earlyBody.error}`);
  ok("instance left unfinished (no score written)", (await db.query(`select completed_at from public.session_instances where id=$1;`, [inst])).rows[0].completed_at === null);

  for (let k = 1; k < min; k++) await userClient.from("session_checkins").insert({ session_instance_id: inst, interval_index: k, response_category: "Independent", credit_value: 100 });
  const half = await fetch(`${BASE}/api/sessions/complete`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie() }, body: JSON.stringify({ session_instance_id: inst }) });
  ok(`exactly half (${min}) check-ins → scored (200)`, half.status === 200, `status ${half.status}`);

  const pdf = await fetch(`${BASE}/api/export`, { headers: { Cookie: cookie() } });
  const pdfBytes = Buffer.from(await pdf.arrayBuffer());
  ok("export default is a real PDF", pdf.status === 200 && pdf.headers.get("content-type") === "application/pdf" && pdfBytes.slice(0, 5).toString() === "%PDF-" && (pdf.headers.get("content-disposition") ?? "").includes(".pdf"), `${pdf.headers.get("content-type")} ${pdfBytes.length}B`);
  const json = await fetch(`${BASE}/api/export?format=json`, { headers: { Cookie: cookie() } });
  const jb = await json.json();
  ok("export?format=json still works", json.status === 200 && jb.children?.[0]?.profile?.name === "Half Kid");
} catch (e) {
  console.error("SMOKE ERROR:", e.message); fail++;
} finally {
  if (uid) await admin.auth.admin.deleteUser(uid).catch(() => {});
  await db.end();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}
