// Run:  node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");

function memStore() {
  const data = {};
  return {
    data,
    async get(keys) {
      if (keys === null || keys === undefined) return { ...data };
      const list = Array.isArray(keys) ? keys : [keys];
      const out = {};
      list.forEach((k) => { if (k in data) out[k] = data[k]; });
      return out;
    },
    async set(obj) { Object.assign(data, JSON.parse(JSON.stringify(obj))); },
    async remove(keys) { (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete data[k]); }
  };
}
const listener = () => ({ addListener() {} });
global.chrome = {
  runtime: { id: "test-ext", onMessage: listener() },
  action: { onClicked: listener(), setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {}, setTitle: async () => {} },
  tabs: { onUpdated: listener(), onRemoved: listener() },
  storage: { session: memStore(), local: memStore() },
  scripting: { executeScript: async () => {} }
};

const bg = require("../extension/background.js");
const local = chrome.storage.local.data;
const session = chrome.storage.session;

const ITEMS = [
  { id: 1, kind: "link", type: "link", text: "Consumer Services", label: "", area: "nav", onScreen: true, disabled: false },
  { id: 2, kind: "button", type: "button", text: "Pay Bill", label: "", area: "main", onScreen: true, disabled: false }
];
const tab = (id = 7, url = "https://bill.example.in/home?token=SECRET&acct=1234567890") => ({ id, url });

function setFetch(fn) { global.fetch = fn; }
const okJson = (body) => async () => ({ ok: true, status: 200, json: async () => body });

test("cleanOut masks long numbers, keeps short ones, trims", () => {
  assert.equal(bg.cleanOut("Account 1234567890 now", 100), "Account … now");
  assert.equal(bg.cleanOut("Card 4111 1111 1111 1111", 100), "Card …");
  assert.equal(bg.cleanOut("Step 5 of 12", 100), "Step 5 of 12");
  assert.equal(bg.cleanOut("  a \n\n b  ", 100), "a b");
  assert.equal(bg.cleanOut("x".repeat(500), 10).length, 10);
});

test("injectable allows web pages only", () => {
  assert.equal(bg.injectable("https://a.com/x"), true);
  assert.equal(bg.injectable("http://localhost:3000"), true);
  assert.equal(bg.injectable("chrome://extensions"), false);
  assert.equal(bg.injectable("about:blank"), false);
  assert.equal(bg.injectable("file:///C:/a.html"), false);
  assert.equal(bg.injectable(undefined), false);
  assert.equal(bg.injectable("https://chromewebstore.google.com/detail/x"), false);
});

test("buildRequest sends host only, masks numbers, drops junk", () => {
  const r = bg.buildRequest({
    goal: "pay bill for 1234567890", lang: "en",
    page: { title: "Bill 9876543210", screen: "Home", total: 2, secret: "x" },
    items: [...ITEMS, { id: "abc" }, { id: 999 }, { id: 3, text: "Call 9999988888", sneaky: "no" }],
    done: ["Pressed Login", 5, ""], password: "hunter2"
  }, tab().url);
  assert.equal(r.page.host, "bill.example.in");
  assert.ok(!JSON.stringify(r).includes("SECRET"), "query string must not be sent");
  assert.ok(!JSON.stringify(r).includes("1234567890"));
  assert.ok(!JSON.stringify(r).includes("9876543210"));
  assert.ok(!JSON.stringify(r).includes("hunter2"));
  assert.ok(!JSON.stringify(r).includes("sneaky"));
  assert.equal(r.items.length, 3);                // "abc" and 999 dropped
  assert.equal(r.items[2].text, "Call …");
  assert.deepEqual(r.done, ["Pressed Login", "5"]);
  assert.equal(r.lang, "en");
});

test("buildRequest keeps body under the size limit", () => {
  const many = Array.from({ length: 80 }, (_, i) => ({ id: i + 1, text: "T".repeat(80), label: "L".repeat(80), area: "main" }));
  const r = bg.buildRequest({ goal: "g", items: many }, "https://a.com");
  assert.ok(new TextEncoder().encode(JSON.stringify(r)).length <= 30000);
  assert.ok(r.items.length >= 5);
});

test("sanitizeStep accepts a good step and normalises it", () => {
  const s = bg.sanitizeStep({ itemId: 2, action: "click", text_en: "Press Pay Bill.", text_hi: "Pay Bill दबाइए।", risk: "medium", isPayment: true }, ITEMS);
  assert.equal(s.itemId, 2);
  assert.equal(s.action, "click");
  assert.equal(s.risk, "medium");
  assert.equal(s.isPayment, true);
});

test("sanitizeStep rejects an invented button", () => {
  assert.equal(bg.sanitizeStep({ itemId: 42, action: "click", text_en: "x" }, ITEMS), null);
});
test("sanitizeStep rejects click without an item and unknown actions", () => {
  assert.equal(bg.sanitizeStep({ itemId: null, action: "click", text_en: "x" }, ITEMS), null);
  assert.equal(bg.sanitizeStep({ itemId: 1, action: "teleport", text_en: "x" }, ITEMS), null);
  assert.equal(bg.sanitizeStep({ itemId: 1, action: "click" }, ITEMS), null); // no text at all
  assert.equal(bg.sanitizeStep("nope", ITEMS), null);
  assert.equal(bg.sanitizeStep(null, ITEMS), null);
});
test("sanitizeStep: manual/done steps never carry an item; text falls back between languages", () => {
  const m = bg.sanitizeStep({ itemId: 1, action: "manual", text_en: "Type your OTP yourself." }, ITEMS);
  assert.equal(m.itemId, null);
  assert.equal(m.text_hi, "Type your OTP yourself.");
  const d = bg.sanitizeStep({ action: "done", text_hi: "हो गया।", risk: "weird" }, ITEMS);
  assert.equal(d.text_en, "हो गया।");
  assert.equal(d.risk, "low");
});
test("sanitizeStep strips control characters and limits length", () => {
  const s = bg.sanitizeStep({ action: "done", text_en: "a\u0000b\u0007c" + "z".repeat(1000) }, ITEMS);
  assert.ok(!/[\u0000-\u001f]/.test(s.text_en));
  assert.ok(s.text_en.length <= 260);
});

test("AI call is refused without consent and does NOT touch the network", async () => {
  let called = 0;
  setFetch(async () => { called++; return { ok: true, status: 200, json: async () => ({}) }; });
  local["saarthi-dev-proxy"] = "http://localhost:9999/x";
  delete local["saarthi-ai-consent-v1"];
  const r = await bg.handleAiNext({ goal: "pay", items: ITEMS }, tab(1));
  assert.deepEqual(r, { ok: false, error: "consent" });
  assert.equal(called, 0);
});

test("AI call: not configured when there is no proxy address", async () => {
  local["saarthi-ai-consent-v1"] = "yes";
  delete local["saarthi-dev-proxy"];
  const r = await bg.handleAiNext({ goal: "pay", items: ITEMS }, tab(2));
  assert.deepEqual(r, { ok: false, error: "not_configured" });
});

test("AI call: happy path sends a clean body and returns one checked step", async () => {
  local["saarthi-ai-consent-v1"] = "yes";
  local["saarthi-dev-proxy"] = "http://localhost:9999/api/next-step";
  let sent = null, headers = null, url = null;
  setFetch(async (u, opts) => {
    url = u; headers = opts.headers; sent = JSON.parse(opts.body);
    return { ok: true, status: 200, json: async () => ({ step: { itemId: 1, action: "click", text_en: "Press Consumer Services.", text_hi: "Consumer Services दबाइए।", risk: "low" } }) };
  });
  const r = await bg.handleAiNext({ goal: "pay my bill", lang: "hi", page: { title: "Home" }, items: ITEMS, done: [] }, tab(3));
  assert.equal(r.ok, true);
  assert.equal(r.step.itemId, 1);
  assert.equal(url, "http://localhost:9999/api/next-step");
  assert.equal(headers["X-Saarthi-Client"], "ext/0.7.0");
  assert.equal(sent.page.host, "bill.example.in");
  assert.ok(!JSON.stringify(sent).includes("SECRET"));
});

test("AI call: errors are mapped to short codes", async () => {
  local["saarthi-ai-consent-v1"] = "yes";
  local["saarthi-dev-proxy"] = "http://localhost:9999/x";
  const body = { goal: "g", items: ITEMS };

  setFetch(async () => { throw new TypeError("Failed to fetch"); });
  assert.deepEqual(await bg.handleAiNext(body, tab(11)), { ok: false, error: "network" });

  setFetch(async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; });
  assert.deepEqual(await bg.handleAiNext(body, tab(12)), { ok: false, error: "timeout" });

  setFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
  assert.deepEqual(await bg.handleAiNext(body, tab(13)), { ok: false, error: "proxy_500" });

  setFetch(async () => ({ ok: false, status: 429, json: async () => ({}) }));
  assert.deepEqual(await bg.handleAiNext(body, tab(14)), { ok: false, error: "rate" });

  setFetch(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("bad json"); } }));
  assert.deepEqual(await bg.handleAiNext(body, tab(15)), { ok: false, error: "bad_response" });

  setFetch(okJson({ step: { itemId: 77, action: "click", text_en: "x" } })); // invented button
  assert.deepEqual(await bg.handleAiNext(body, tab(16)), { ok: false, error: "bad_response" });
});

test("AI call: empty goal and empty page are refused before the network", async () => {
  local["saarthi-ai-consent-v1"] = "yes";
  local["saarthi-dev-proxy"] = "http://localhost:9999/x";
  let called = 0;
  setFetch(async () => { called++; return { ok: true, status: 200, json: async () => ({}) }; });
  assert.deepEqual(await bg.handleAiNext({ goal: "   ", items: ITEMS }, tab(21)), { ok: false, error: "no_goal" });
  assert.deepEqual(await bg.handleAiNext({ goal: "g", items: [] }, tab(22)), { ok: false, error: "empty_page" });
  assert.equal(called, 0);
});

test("AI call: max 20 per minute per tab, other tabs unaffected", async () => {
  local["saarthi-ai-consent-v1"] = "yes";
  local["saarthi-dev-proxy"] = "http://localhost:9999/x";
  setFetch(okJson({ step: { action: "done", text_en: "Done." } }));
  let last;
  for (let i = 0; i < 21; i++) last = await bg.handleAiNext({ goal: "g", items: ITEMS }, tab(31));
  assert.deepEqual(last, { ok: false, error: "rate" });
  const other = await bg.handleAiNext({ goal: "g", items: ITEMS }, tab(32));
  assert.equal(other.ok, true);
});

test("messages: OFF tab is refused, ON tab can keep a goal, bad keys refused", async () => {
  const from = (id) => ({ id: "test-ext", tab: tab(id) });
  assert.deepEqual(await bg.handleMessage({ type: "saarthi:session:set", key: "saarthi-task-v2", value: "{}" }, from(50)), { ok: false, error: "off" });
  assert.deepEqual(await bg.handleMessage({ type: "saarthi:ai:next", payload: {} }, from(50)), { ok: false, error: "off" });

  await session.set({ "on:51": true });
  assert.deepEqual(await bg.handleMessage({ type: "saarthi:session:set", key: "saarthi-task-v2", value: '{"goal":"x"}' }, from(51)), { ok: true });
  const got = await bg.handleMessage({ type: "saarthi:session:getAll" }, from(51));
  assert.equal(got.values["saarthi-task-v2"], '{"goal":"x"}');
  // another tab does not see it
  await session.set({ "on:52": true });
  assert.deepEqual((await bg.handleMessage({ type: "saarthi:session:getAll" }, from(52))).values, {});
  // bad key / too long / wrong type
  assert.equal((await bg.handleMessage({ type: "saarthi:session:set", key: "evil", value: "x" }, from(51))).error, "bad_key");
  assert.equal((await bg.handleMessage({ type: "saarthi:session:set", key: "saarthi-task-v2", value: "x".repeat(9000) }, from(51))).error, "bad_key");
  assert.equal((await bg.handleMessage({ type: "saarthi:session:set", key: "saarthi-task-v2", value: 5 }, from(51))).error, "bad_key");
  // remove
  await bg.handleMessage({ type: "saarthi:session:remove", key: "saarthi-task-v2" }, from(51));
  assert.deepEqual((await bg.handleMessage({ type: "saarthi:session:getAll" }, from(51))).values, {});
  // unknown message, and a sender without a tab
  assert.equal((await bg.handleMessage({ type: "nope" }, from(51))).error, "unknown_message");
  assert.equal((await bg.handleMessage({ type: "saarthi:hello" }, { id: "test-ext" })).error, "no_tab");
});

test("toggleTab: on, off, and refused on chrome:// pages", async () => {
  const calls = [];
  chrome.scripting.executeScript = async (a) => { calls.push(a); };
  const on = await bg.toggleTab({ id: 60, url: "https://a.com" });
  assert.deepEqual(on, { ok: true, on: true });
  assert.ok(calls.some((c) => c.files && c.files[0] === "raasta.js"));
  await session.set({ "sess:60": { "saarthi-task-v2": "{}" } });
  const off = await bg.toggleTab({ id: 60, url: "https://a.com" });
  assert.deepEqual(off, { ok: true, on: false });
  assert.equal((await session.get("sess:60"))["sess:60"], undefined, "turning OFF forgets the goal");
  const blocked = await bg.toggleTab({ id: 61, url: "chrome://extensions" });
  assert.equal(blocked.reason, "not_allowed");
  assert.equal((await session.get("on:61"))["on:61"], undefined);
});
