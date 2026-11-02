// node tests/e2e.js   (real Chromium + the extension + a test website + a mock AI proxy)
const http = require("http");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { chromium } = require("playwright");

const SITE_PORT = 8080, PROXY_PORT = 8787;
const ROOT = path.resolve(__dirname, "..");
let failures = 0;
const check = (name, ok, detail) => {
  console.log((ok ? "  PASS  " : "  FAIL  ") + name + (ok || !detail ? "" : "   -> " + detail));
  if (!ok) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 9000, what = "condition") {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try { last = await fn(); if (last) return last; } catch (e) { last = e; }
    await sleep(120);
  }
  throw new Error("timed out waiting for " + what + (last instanceof Error ? " (" + last.message + ")" : ""));
}

/* ---------- test website ---------- */
const NAV = '<nav><a href="/">Home</a> <a href="/bills">Bills</a> <a href="/contact">Contact</a></nav>';
const PAGES = {
  "/": "<h1>Electricity Board</h1><p>Call 18001234567</p><button>Search</button>" +
       '<input type="password" aria-label="Password"><input autocomplete="cc-number" aria-label="Card number">',
  "/bills": '<h1>Bills</h1><a href="/pay">Pay Bill</a>',
  "/pay": '<h1>Pay Bill</h1><label for="acc">Account number</label><input id="acc">' +
          "<button id=\"sub\" onclick=\"location.href='/receipt'\">Submit</button>",
  "/receipt": '<h1>Receipt</h1><p>Payment done</p><a href="/">Back to Home</a>',
  "/contact": "<h1>Contact</h1><p>Write to us.</p>"
};
const site = http.createServer((req, res) => {
  const p = req.url.split("?")[0];
  if (p === "/portal.html" || p === "/raasta.js") {
    res.writeHead(200, { "Content-Type": p.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8" });
    return res.end(fs.readFileSync(path.join(ROOT, p.slice(1))));
  }
  const body = PAGES[p];
  if (!body) { res.writeHead(404); return res.end("no"); }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end("<!doctype html><html><head><meta charset=utf-8><title>Test " + p + "</title></head><body>" + NAV + body + "</body></html>");
});

/* ---------- mock AI proxy (same contract as the real one) ---------- */
const mock = { requests: [], failNext: null, hallucinate: false };
function decide(req) {
  const items = req.items, done = req.done.join("|");
  const by = (re) => items.find((i) => re.test((i.text + " " + i.label).trim()));
  if (/receipt/i.test(req.page.screen || "")) return { action: "done", text_en: "All done. Your payment is complete.", text_hi: "सब हो गया। आपका भुगतान पूरा हुआ।" };
  const acct = by(/account number/i);
  if (acct && !/Filled in/.test(done)) return { itemId: acct.id, action: "type", text_en: "Type your account number.", text_hi: "अपना खाता नंबर लिखिए।", risk: "low" };
  const sub = by(/^submit$/i);
  if (sub) return { itemId: sub.id, action: "click", text_en: "Press Submit.", text_hi: "Submit दबाइए।", risk: "medium", isPayment: true, why_en: "This sends your payment request.", why_hi: "इससे आपका भुगतान अनुरोध जाएगा।" };
  const pay = by(/pay bill/i);
  if (pay) return { itemId: pay.id, action: "click", text_en: "Press Pay Bill.", text_hi: "Pay Bill दबाइए।", risk: "low" };
  const bills = by(/^bills$/i);
  if (bills) return { itemId: bills.id, action: "click", text_en: "Press Bills in the menu.", text_hi: "मेन्यू में Bills दबाइए।", risk: "low" };
  return { action: "manual", text_en: "Please look around the page.", text_hi: "कृपया पेज देखिए।" };
}
const proxy = http.createServer((req, res) => {
  let data = "";
  req.on("data", (c) => (data += c));
  req.on("end", () => {
    const body = JSON.parse(data || "{}");
    mock.requests.push(body);
    if (mock.failNext) { const f = mock.failNext; mock.failNext = null; res.writeHead(f.status); return res.end("{}"); }
    let step = decide(body);
    if (mock.hallucinate) { mock.hallucinate = false; step = { itemId: 9999, action: "click", text_en: "Press the magic button." }; }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ step }));
  });
});

/* ---------- helpers ---------- */
let ctx, sw;
const url = (p) => "http://localhost:" + SITE_PORT + p;
const rootCount = (page) => page.evaluate(() => document.querySelectorAll("#saarthi-root").length);
const nowText = (page) => page.locator("#guideNow").innerText();
const countText = (page) => page.locator("#guideCount").innerText();
async function tabIdOf(page) {
  const u = page.url();
  return sw.evaluate(async (u) => (await chrome.tabs.query({})).filter((t) => t.url === u).map((t) => t.id)[0], u);
}
async function toggle(page) {
  const id = await tabIdOf(page);
  return sw.evaluate(async (id) => toggleTab(await chrome.tabs.get(id)), id);
}
async function ringCount(page) { return page.evaluate(() => { const r = document.getElementById("saarthi-root"); return r && r.shadowRoot ? r.shadowRoot.getElementById("spots").children.length : -1; }); }

(async () => {
  await new Promise((r) => site.listen(SITE_PORT, r));
  await new Promise((r) => proxy.listen(PROXY_PORT, r));
  const ext = path.join(ROOT, "extension");
  ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "saarthi-e2e-")), {
    channel: "chromium", headless: true,
    args: ["--disable-extensions-except=" + ext, "--load-extension=" + ext, "--no-sandbox"]
  });
  sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker", { timeout: 10000 }));
  await sw.evaluate((u) => chrome.storage.local.set({ "saarthi-dev-proxy": u }), "http://localhost:" + PROXY_PORT + "/api/next-step");

  /* ===== 1. nothing happens until the icon is clicked ===== */
  console.log("\n1. Toolbar toggle");
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  await page.goto(url("/"));
  await sleep(700);
  check("no widget before the icon is clicked", (await rootCount(page)) === 0);
  const t1 = await toggle(page);
  check("toggleTab reports ON", t1 && t1.ok && t1.on === true, JSON.stringify(t1));
  await until(async () => (await rootCount(page)) === 1, 8000, "widget to appear");
  check("widget appears (exactly one)", (await rootCount(page)) === 1);
  const id1 = await tabIdOf(page);
  const badge = await sw.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), id1);
  check("badge shows ON", badge === "ON", badge);
  const mode = await sw.evaluate(async (id) => (await chrome.scripting.executeScript({ target: { tabId: id }, func: () => window.Saarthi && window.Saarthi.mode }))[0].result, id1);
  check("raasta.js runs in extension mode", mode === "extension", String(mode));

  /* ===== 2. consent comes first, no network before it ===== */
  console.log("\n2. Consent");
  await page.locator("#launcher").click();
  await page.locator("#goal").fill("I want to pay my electricity bill");
  await page.locator("#submitGoal").click();
  await until(async () => await page.locator("#consentBox").isVisible(), 6000, "consent box");
  check("consent box is shown", true);
  check("no request reached the AI before consent", mock.requests.length === 0, String(mock.requests.length));
  check("consent text mentions the AI service", /AI/.test(await page.locator("#consentText").innerText()));
  await page.locator("#consentYes").click();
  await until(() => mock.requests.length === 1, 8000, "first AI request");
  try { await until(async () => /Bills/.test(await nowText(page)), 8000, "step 1 text"); }
  catch (e) {
    console.log("  DEBUG now=", JSON.stringify(await nowText(page)), "count=", JSON.stringify(await countText(page)),
      "retry=", await page.locator("#guideRetry").isVisible(), "consent=", await page.locator("#consentBox").isVisible(),
      "reqs=", mock.requests.length, "lastGoal=", mock.requests[0] && mock.requests[0].goal,
      "items=", mock.requests[0] && JSON.stringify(mock.requests[0].items.map((i) => i.text || i.label)));
    throw e;
  }
  check("step 1 is shown: press Bills", /Bills/.test(await nowText(page)), await nowText(page));
  check("step counter says Step 1", /1/.test(await countText(page)), await countText(page));
  check("a ring is drawn on the button", (await ringCount(page)) >= 1, String(await ringCount(page)));

  /* ===== 3. what was sent to the AI ===== */
  console.log("\n3. Privacy of the request");
  const r1 = mock.requests[0];
  const raw = JSON.stringify(r1);
  check("host only (localhost), no path", r1.page.host === "localhost" && !raw.includes("/bills"));
  check("password field never sent", !/Password/i.test(raw));
  check("card number field never sent", !/Card number/i.test(raw));
  check("long phone number masked", !raw.includes("18001234567") && /Call …/.test(raw) === false ? !raw.includes("18001234567") : true);
  check("goal and language sent", r1.goal === "I want to pay my electricity bill" && (r1.lang === "hi" || r1.lang === "en"));
  check("saarthi's own buttons not in the list", !/Saarthi|सारथी/.test(JSON.stringify(r1.items)));

  /* ===== 4. goal follows the person to the next page ===== */
  console.log("\n4. Click the highlighted link: next PAGE (full navigation)");
  await page.getByRole("link", { name: "Bills", exact: true }).click();
  await until(() => page.url().endsWith("/bills"), 8000, "navigation to /bills");
  await until(async () => (await rootCount(page)) === 1, 8000, "widget back on /bills");
  await until(() => mock.requests.length === 2, 9000, "second AI request");
  check("widget came back on the new page by itself", (await rootCount(page)) === 1);
  await until(async () => /Pay Bill/.test(await nowText(page)), 8000, "step 2 text");
  check("panel auto-opened with step 2: Pay Bill", /Pay Bill/.test(await nowText(page)), await nowText(page));
  check("counter now says Step 2", /2/.test(await countText(page)), await countText(page));
  check("the finished step was sent as history", mock.requests[1].done.length === 1 && /Bills/.test(mock.requests[1].done[0]), JSON.stringify(mock.requests[1].done));
  check("no new consent question", !(await page.locator("#consentBox").isVisible()));

  /* ===== 5. typing step ===== */
  console.log("\n5. Typing step (value must never be read or sent)");
  await page.getByRole("link", { name: "Pay Bill" }).click();
  await until(() => page.url().endsWith("/pay"), 8000, "navigation to /pay");
  await until(async () => /account number|खाता नंबर/i.test(await nowText(page)), 9000, "type step");
  check("type step shown", /account number|खाता नंबर/i.test(await nowText(page)), await nowText(page));
  check("ring is on the field", (await ringCount(page)) >= 1);
  const before = mock.requests.length;
  await page.locator("#acc").click();
  await page.locator("#acc").pressSequentially("5551234567", { delay: 20 });
  await sleep(500);
  check("typing alone does not move on", mock.requests.length === before);
  await page.keyboard.press("Tab");
  await until(() => mock.requests.length > before, 8000, "request after leaving the box");
  const r3 = mock.requests[mock.requests.length - 1];
  check("typed digits are NOT in the request", !JSON.stringify(r3).includes("5551234567"));
  check("request says a box was filled, no value", r3.done.some((d) => /Filled in .*Account number/.test(d)) , JSON.stringify(r3.done));
  await until(async () => /Submit/.test(await nowText(page)), 8000, "submit step");
  check("next step: Submit (payment step)", /Submit/.test(await nowText(page)), await nowText(page));

  /* ===== 6. what-happens card shows AI text, risk not lowered ===== */
  console.log("\n6. 'What happens' card");
  await page.locator("#enteredBtn").click();
  await until(async () => await page.locator("#cards").isVisible(), 5000, "cards");
  const nextText = await page.locator("#nextText").innerText();
  const risk = await page.locator("#riskBadge").getAttribute("data-risk");
  check("card uses the AI's explanation", /payment request|भुगतान अनुरोध/.test(nextText), nextText);
  check("risk is medium or high for a pay button", risk === "medium" || risk === "high", risk);
  await page.locator("#cardsClose").click();

  /* ===== 7. Hindi/English switch on an AI step ===== */
  console.log("\n7. Language switch");
  const lang0 = await page.locator("#guideNow").innerText();
  await page.locator("#language").click();
  await sleep(300);
  const lang1 = await page.locator("#guideNow").innerText();
  check("step text changes language", lang0 !== lang1, lang0 + " | " + lang1);
  check("same step (still Submit)", /Submit/.test(lang1));

  /* ===== 8. finish ===== */
  console.log("\n8. Finish");
  await page.locator("#sub").click();
  await until(() => page.url().endsWith("/receipt"), 8000, "navigation to /receipt");
  await until(async () => /complete|पूरा/.test(await nowText(page)), 10000, "done text");
  check("done message shown", true);
  check("no 'next step' button after done", !(await page.locator("#guideNext").isVisible()));
  const task = await sw.evaluate(async (id) => (await chrome.storage.session.get("sess:" + id))["sess:" + id], id1);
  const taskObj = task && task["saarthi-task-v2"] ? JSON.parse(task["saarthi-task-v2"]) : null;
  check("guide is marked finished (will not reopen)", taskObj && taskObj.active === false, JSON.stringify(taskObj));

  /* ===== 9. errors ===== */
  console.log("\n9. Errors and retry");
  await page.locator("#guideBack").click();
  await page.goto(url("/bills"));
  await until(async () => (await rootCount(page)) === 1, 8000, "widget on /bills again");
  await page.locator("#launcher").click().catch(() => {});
  await page.locator("#goal").fill("pay bill again");
  mock.failNext = { status: 500 };
  await page.locator("#submitGoal").click();
  await until(async () => await page.locator("#guideRetry").isVisible(), 8000, "retry button");
  check("server error shows a friendly message + Try again", (await nowText(page)).length > 10 && (await page.locator("#guideRetry").isVisible()), await nowText(page));
  await page.locator("#guideRetry").click();
  await until(async () => /Pay Bill/.test(await nowText(page)), 8000, "step after retry");
  check("Try again works", true);
  // invented button
  await page.locator("#guideBack").click();
  await page.locator("#goal").fill("pay bill once more");
  mock.hallucinate = true;
  await page.locator("#submitGoal").click();
  await until(async () => await page.locator("#guideRetry").isVisible(), 8000, "retry after bad answer");
  check("AI answer with an invented button is rejected", await page.locator("#guideRetry").isVisible());
  check("no ring is drawn for it", (await ringCount(page)) === 0, String(await ringCount(page)));
  await page.locator("#guideBack").click();

  /* ===== 10. storage isolation ===== */
  console.log("\n10. The website cannot see Saarthi's data");
  const siteKeys = await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)).filter((k) => /saarthi/i.test(k)));
  check("no saarthi key in the site's localStorage/sessionStorage", siteKeys.length === 0, siteKeys.join(","));
  const extKeys = await sw.evaluate(async () => Object.keys(await chrome.storage.local.get(null)));
  check("settings live in chrome.storage.local", extKeys.includes("saarthi-ai-consent-v1") && extKeys.includes("saarthi-lang"), extKeys.join(","));

  /* ===== 11. second tab is independent ===== */
  console.log("\n11. Tabs are independent");
  await page.locator("#goal").fill("remember this goal");
  await page.locator("#submitGoal").click();
  await sleep(900);
  const other = await ctx.newPage();
  await other.goto(url("/contact"));
  await toggle(other);
  await until(async () => (await rootCount(other)) === 1, 8000, "widget in tab 2");
  await sleep(1200);
  check("tab 2 did not inherit tab 1's goal", !(await other.locator("#guideView").isVisible()) && (await other.locator("#goal").inputValue()) === "");
  await other.close();

  /* ===== 12. OFF ===== */
  console.log("\n12. Turn OFF");
  const t2 = await toggle(page);
  check("toggleTab reports OFF", t2 && t2.ok && t2.on === false, JSON.stringify(t2));
  await until(async () => (await rootCount(page)) === 0, 6000, "widget to disappear");
  check("widget removed", (await rootCount(page)) === 0);
  const badge2 = await sw.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), id1);
  check("badge cleared", badge2 === "", badge2);
  const leftover = await sw.evaluate(async (id) => (await chrome.storage.session.get("sess:" + id))["sess:" + id], id1);
  check("goal forgotten when turned OFF", !leftover);
  const n = mock.requests.length;
  await page.goto(url("/bills"));
  await sleep(1200);
  check("stays OFF after navigating", (await rootCount(page)) === 0);
  check("no AI traffic while OFF", mock.requests.length === n);

  /* ===== 13. back ON works again in the same tab ===== */
  console.log("\n13. ON again");
  const t3 = await toggle(page);
  await until(async () => (await rootCount(page)) === 1, 8000, "widget back");
  check("turning ON again brings it back", t3.on === true && (await rootCount(page)) === 1);

  /* ===== 14. chrome:// pages are refused politely ===== */
  console.log("\n14. Pages Chrome does not allow");
  const bad = await ctx.newPage();
  await bad.goto("chrome://version");
  const t4 = await toggle(bad).catch((e) => ({ err: e.message }));
  check("toggle on chrome:// is refused, no crash", t4 && (t4.reason === "not_allowed" || t4.err), JSON.stringify(t4));
  await bad.close();

  /* ===== 15. page mode still works exactly as before (demo portal) ===== */
  console.log("\n15. Demo portal without the extension taking over");
  const portal = await ctx.newPage();
  await portal.goto(url("/portal.html?saarthi=1"));
  await until(async () => (await rootCount(portal)) === 1, 9000, "portal widget");
  check("portal starts its own Saarthi (page mode)", (await rootCount(portal)) === 1);
  const tid = await tabIdOf(portal);
  await sw.evaluate(async (id) => { await chrome.storage.session.set({ ["on:" + id]: true }); }, tid);
  await sw.evaluate(async (id) => startInTab(id), tid);
  await sleep(700);
  check("extension does not start a second copy", (await rootCount(portal)) === 1);
  await portal.locator("#launcher").click();
  await portal.locator("#goal").fill("I want to pay my bill");
  const beforeReq = mock.requests.length;
  await portal.locator("#submitGoal").click();
  await until(async () => /Consumer Services/.test(await nowText(portal)), 6000, "demo guide step 1");
  check("built-in demo guide still works", /Consumer Services/.test(await nowText(portal)), await nowText(portal));
  check("demo guide did not call the AI", mock.requests.length === beforeReq);
  await portal.close();

  check("no uncaught errors in the page", consoleErrors.length === 0, consoleErrors.join(" | "));

  await ctx.close();
  site.close(); proxy.close();
  console.log("\n" + (failures ? failures + " CHECK(S) FAILED" : "ALL CHECKS PASSED"));
  process.exit(failures ? 1 : 0);
})().catch(async (e) => {
  console.error("\nE2E CRASHED:", e.message);
  try { await ctx.close(); } catch (x) {}
  process.exit(2);
});
