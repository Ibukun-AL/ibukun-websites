// Vercel function: POST /api/brief. Emails a brief through Resend.
// Env (server only): RESEND_API_KEY, CONTACT_FROM, CONTACT_TO.
const WINDOW_MS = 3_600_000;
const LIMIT = 3;
const hits = new Map(); // best-effort, per instance

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

const clean = (v, max) => String(v ?? "").trim().slice(0, max);

function limited(ip, now) {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) { hits.set(ip, recent); return Math.ceil((recent[0] + WINDOW_MS - now) / 1000); }
  recent.push(now); hits.set(ip, recent);
  return 0;
}

export async function handleBrief(request, send, now = Date.now()) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  let form;
  try { form = await request.formData(); } catch { return json({ error: "Send the brief form." }, 400); }

  if (clean(form.get("website"), 200)) return json({ ok: true }); // honeypot: pretend it worked

  const name = clean(form.get("name"), 120);
  const email = clean(form.get("email"), 200);
  const pack = clean(form.get("package"), 120);
  const brief = clean(form.get("brief"), 4000);
  if (!name) return json({ error: "Write your name." }, 422);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Write an email address with an @." }, 422);
  if (!pack) return json({ error: "Write which package." }, 422);
  if (!brief) return json({ error: "Write a few lines about the site." }, 422);

  const wait = limited(ip, now);
  if (wait) return json({ error: "You have sent three briefs this hour. Try again later." }, 429, { "Retry-After": String(wait) });

  try {
    await send({ subject: `Brief: ${pack} from ${name}`, replyTo: email, text: `Name: ${name}\nEmail: ${email}\nPackage: ${pack}\n\n${brief}` });
  } catch {
    return json({ error: "Couldn't send that right now. Please try again." }, 502);
  }
  return json({ ok: true });
}

async function resend({ subject, replyTo, text }) {
  const key = process.env.RESEND_API_KEY, from = process.env.CONTACT_FROM, to = process.env.CONTACT_TO;
  if (!key || !from || !to) throw new Error("mail is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to, reply_to: replyTo, subject, text }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}

export default { fetch: (request) => (request.method === "POST" ? handleBrief(request, resend) : json({ error: "Use POST." }, 405)) };
