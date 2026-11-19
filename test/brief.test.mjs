import { test } from "node:test";
import assert from "node:assert/strict";
import { handleBrief } from "../api/brief.js";

const form = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return new Request("https://x.test/api/brief", { method: "POST", body: f, headers: { "x-forwarded-for": o.__ip || "1.1.1.1" } }); };
const good = { name: "Ada", email: "ada@example.com", package: "Business site", brief: "A site for my bakery, live by March." };

test("sends a valid brief and answers ok", async () => {
  let sent;
  const res = await handleBrief(form(good), async (m) => { sent = m; });
  assert.equal(res.status, 200);
  assert.match(sent.subject, /Business site/);
  assert.match(sent.text, /bakery/);
});

test("rejects a missing field with 422 and names it", async () => {
  const res = await handleBrief(form({ ...good, email: "nope", __ip: "2.2.2.2" }), async () => {});
  assert.equal(res.status, 422);
  assert.match((await res.json()).error, /email/i);
});

test("silently accepts the honeypot without sending", async () => {
  let called = false;
  const res = await handleBrief(form({ ...good, website: "http://spam", __ip: "3.3.3.3" }), async () => { called = true; });
  assert.equal(res.status, 200);
  assert.equal(called, false);
});

test("limits one visitor to three briefs an hour", async () => {
  const send = async () => {};
  for (let i = 0; i < 3; i++) assert.equal((await handleBrief(form({ ...good, __ip: "4.4.4.4" }), send)).status, 200);
  assert.equal((await handleBrief(form({ ...good, __ip: "4.4.4.4" }), send)).status, 429);
});

test("returns 502 when sending fails", async () => {
  const res = await handleBrief(form({ ...good, __ip: "5.5.5.5" }), async () => { throw new Error("down"); });
  assert.equal(res.status, 502);
});
