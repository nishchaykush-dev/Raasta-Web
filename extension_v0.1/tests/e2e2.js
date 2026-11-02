// node tests/e2e2.js  -> harder scenarios + screenshots (tests/shots/)
const http = require("http");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { chromium } = require("playwright");

const SITE_PORT = 8080, PROXY_PORT = 8787;
const ROOT = path.resolve(__dirname, "..");
const SHOTS = path.join(__dirname, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
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

const NAV = '<nav><a href="/">Home</a> <a href="/bills">Bills</a> <a href="/contact">Contact</a></nav>';
const PAGES = {
  "/": '<h1>Electricity Board</h1><a href="tel:18001234567">Call 18001234567 now</a> <button>Search</button>',
  "/bills": '<h1>Bills</h1><a href="/pay">Pay Bill</a>',
  "/pay": '<h1>Pay Bill</h1><label for="acc">Account number</label><input id="acc"><button onclick="location.href=\'/receipt\'">Submit</button>',
  "/receipt": '<h1>Receipt</h1><p>Done</p>',
  "/contact": "<h1>Contact</h1><p>Write to us.</p>",
  "/spa": '<h1>Menu demo</h1><button id="m">Menu</button><div id="box"></div>' +
          "<script>document.getElementById('m').onclick=function(){document.getElementById('box').innerHTML='<a href=\"/bills\">Pay Bill</a>'}</script>",
  "/manual": "<h1>Manual</h1><p>Nothing clickable that matters.</p>"
};
const site = http.createServer((req, res) => {
  const body = PAGES[req.url.split("?")[0]];
  if (!body) { res.writeHead(404); return res.end("no"); }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end("<!doctype html><html><head><meta charset=utf-8><title>Test</title></head><body>" + NAV + body + "</body></html>");
});

const mock = { requests: [] };
function decide(req) {
  const items = req.items, done = req.done.join("|");
  const by = (re) => items.find((i) => re.test((i.text + " " + i.label).trim()));
  if (/receipt/i.test(req.page.screen || "")) return { action: "done", text_en: "All done.", text_hi: "सब हो गया।" };
  if (/manual/i.test(req.page.screen || "")) return { action: "manual", text_en: "Type your OTP yourself, then press Done.", text_hi: "OTP आप खुद लिखिए, फिर Done दबाइए।" };
  const acct = by(/account number/i);
  if (acct && !/Filled in/.test(done)) return { itemId: acct.id, action: "type", text_en: "Type your account number.", text_hi: "खाता नंबर लिखिए।" };
  const sub = by(/^submit$/i);
  if (sub) return { itemId: sub.id, action: "click", text_en: "Press Submit.", text_hi: "Submit दबाइए।", risk: "medium", isPayment: true };
  const pay = by(/pay bill/i);
  if (pay) return { itemId: pay.id, action: "click", text_en: "Press Pay Bill.", text_hi: "Pay Bill दबाइए।" };
  const menu = by(/^menu$/i);
  if (menu && !/Menu/.test(done)) return { itemId: menu.id, action: "click", text_en: "Press Menu.", text_hi: "Menu दबाइए।" };
  const bills = by(/^bills$/i);
  if (bills) return { itemId: bills.id, action: "click", text_en: "Press Bills.", text_hi: "Bills दबाइए।" };
  return { action: "manual", text_en: "Look around the page.", text_hi: "पेज देखिए।" };
}
const proxy = http.createServer((req, res) => {
  let data = "";
  req.on("data", (c) => (data += c));
  req.on("end", () => {
    const body = JSON.parse(data || "{}");
    mock.requests.push(body);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ step: decide(body) }));
  });
});

let ctx, sw;
const url = (p, host = "localhost") => "http://" + host + ":" + SITE_PORT + p;
const rootCount = (page) => page.evaluate(() => document.querySelectorAll("#saarthi-root").length);
const nowText = (page) => page.locator("#guideNow").innerText();
async function tabIdOf(page) {
  const u = page.url();
  return sw.evaluate(async (u) => (await chrome.tabs.query({})).filter((t) => t.url === u).map((t) => t.id)[0], u);
}
async function toggle(page) {
  const id = await tabIdOf(page);
  return sw.evaluate(async (id) => toggleTab(await chrome.tabs.get(id)), id);
}
async function inExt(page, fn) {   // run a function inside the extension's world of this tab
  const id = await tabIdOf(page);
  return sw.evaluate(async ({ id, src }) => (await chrome.scripting.executeScript({ target: { tabId: id }, func: new Function("return (" + src + ")()") }))[0].result, { id, src: fn.toString() });
}

(async () => {
  await new Promise((r) => site.listen(SITE_PORT, r));
  await new Promise((r) => proxy.listen(PROXY_PORT, r));
  const ext = path.join(ROOT, "extension");
  ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "saarthi-e2e2-")), {
    channel: "chromium", headless: true, viewport: { width: 1100, height: 760 },
    args: ["--disable-extensions-except=" + ext, "--load-extension=" + ext, "--no-sandbox"]
  });
  sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker", { timeout: 10000 }));
  await sw.evaluate((u) => chrome.storage.local.set({ "saarthi-dev-proxy": u }), "http://localhost:" + PROXY_PORT + "/api/next-step");
  const extId = new URL(sw.url()).host;

  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  /* A. masking of a phone number inside a button/link name */
  console.log("\nA. Numbers inside button names are masked");
  await page.goto(url("/"));
  await toggle(page);
  await until(async () => (await rootCount(page)) === 1, 8000, "widget");
  await page.locator("#launcher").click();
  await page.locator("#goal").fill("find the helpline");
  await page.locator("#submitGoal").click();
  await until(async () => await page.locator("#consentBox").isVisible(), 6000, "consent");
  await page.screenshot({ path: path.join(SHOTS, "1-consent.png") });

  /* B. declining consent */
  console.log("\nB. Declining consent");
  await page.locator("#consentNo").click();
  await sleep(600);
  check("declining goes back to the home view", await page.locator("#goal").isVisible() && !(await page.locator("#guideView").isVisible()));
  check("declining sends nothing to the AI", mock.requests.length === 0);
  const consentStored = await sw.evaluate(async () => (await chrome.storage.local.get("saarthi-ai-consent-v1"))["saarthi-ai-consent-v1"]);
  check("declining stores no consent", consentStored === undefined, String(consentStored));

  /* C. accept, see request */
  await page.locator("#goal").fill("find the helpline");
  await page.locator("#submitGoal").click();
  await until(async () => await page.locator("#consentBox").isVisible(), 6000, "consent again");
  await page.locator("#consentYes").click();
  await until(() => mock.requests.length === 1, 8000, "request");
  const raw = JSON.stringify(mock.requests[0]);
  check("phone number masked in the item list", !raw.includes("18001234567") && raw.includes("Call …"), raw.slice(0, 400));
  await until(async () => (await nowText(page)).length > 3 && !/सोच|Thinking/.test(await nowText(page)), 8000, "step text");
  await page.screenshot({ path: path.join(SHOTS, "2-step.png") });

  /* D. closing the panel stops the guide: it must not reopen on the next page */
  console.log("\nD. Closing the panel stops the guide");
  await page.locator("#close").click();
  await sleep(400);
  await page.goto(url("/contact"));
  await until(async () => (await rootCount(page)) === 1, 8000, "widget on next page");
  await sleep(1500);
  check("panel did not pop open again", !(await page.locator("#panel").isVisible()));
  const reqsAfterClose = mock.requests.length;
  check("no AI request after closing", reqsAfterClose === 1, String(reqsAfterClose));

  /* E. a click that does NOT change the page (menu opens) */
  console.log("\nE. Click without page change (menu)");
  await page.goto(url("/spa"));
  await until(async () => (await rootCount(page)) === 1, 8000, "widget on /spa");
  await page.locator("#launcher").click();
  await page.locator("#goal").fill("pay my bill");
  await page.locator("#submitGoal").click();
  await until(async () => /Menu/.test(await nowText(page)), 9000, "Menu step");
  check("step 1: press Menu", /Menu/.test(await nowText(page)));
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await until(async () => /Pay Bill/.test(await nowText(page)), 9000, "Pay Bill step after the menu opened");
  check("step 2 appears on the SAME page after the menu opened", /Pay Bill/.test(await nowText(page)), await nowText(page));
  await page.screenshot({ path: path.join(SHOTS, "3-after-menu.png") });

  /* F. goal follows the person to a DIFFERENT website (different origin) */
  console.log("\nF. Different website (different origin)");
  const reqBefore = mock.requests.length;
  await page.goto(url("/bills", "127.0.0.1"));
  await until(async () => (await rootCount(page)) === 1, 9000, "widget on the other origin");
  await until(() => mock.requests.length > reqBefore, 9000, "request from the other origin");
  const rF = mock.requests[mock.requests.length - 1];
  check("widget + goal followed to another origin", rF.goal === "pay my bill", rF.goal);
  check("the other site's host is reported", rF.page.host === "127.0.0.1", rF.page.host);
  check("history of finished steps came along", rF.done.length >= 1 && /Menu/.test(rF.done.join("|")), JSON.stringify(rF.done));

  /* G. manual step + the Done button */
  console.log("\nG. Manual step and the Done button");
  await page.goto(url("/manual"));
  await until(async () => (await rootCount(page)) === 1, 9000, "widget on /manual");
  await until(async () => /OTP/.test(await nowText(page)), 9000, "manual step text");
  check("manual step shown", /OTP/.test(await nowText(page)));
  check("no ring for a manual step", (await page.evaluate(() => document.getElementById("saarthi-root").shadowRoot.getElementById("spots").children.length)) === 0);
  check("Done button visible", await page.locator("#guideNext").isVisible());
  const nBefore = mock.requests.length;
  await page.screenshot({ path: path.join(SHOTS, "4-manual.png") });
  await page.locator("#guideNext").click();
  await until(() => mock.requests.length > nBefore, 9000, "request after Done");
  const rG = mock.requests[mock.requests.length - 1];
  check("pressing Done reports it as done by the person", rG.done.some((d) => /person did this themselves/.test(d)), JSON.stringify(rG.done));

  /* I. "Sab mita do" removes the consent as well */
  console.log("\nI. Wipe everything");
  await inExt(page, () => { window.Saarthi.clearAll(); return true; });
  await sleep(600);
  const keys = await sw.evaluate(async () => Object.keys(await chrome.storage.local.get(null)).filter((k) => k !== "saarthi-dev-proxy"));
  check("consent and history are gone from chrome.storage.local", !keys.includes("saarthi-ai-consent-v1") && !keys.includes("saarthi-history-v2"), keys.join(","));
  if (await page.locator("#guideBack").isVisible()) await page.locator("#guideBack").click();
  await page.locator("#goal").fill("pay my bill");
  await page.locator("#submitGoal").click();
  await until(async () => await page.locator("#consentBox").isVisible(), 6000, "consent asked again");
  check("after wiping, the consent question is asked again", true);
  await page.screenshot({ path: path.join(SHOTS, "5-consent-again.png") });
  const nI = mock.requests.length;
  await page.locator("#consentYes").click();
  await until(() => mock.requests.length > nI, 8000, "request after re-consent");


  /* H. the service worker is killed (Chrome does this after ~30 s idle) */
  console.log("\nH. Service worker restart in the middle of a journey");
  await page.goto(url("/bills"));
  await until(async () => (await rootCount(page)) === 1, 9000, "widget on /bills");
  await until(async () => /Pay Bill/.test(await nowText(page)), 9000, "Pay Bill step");
  const cdp = await ctx.newCDPSession(page);
  let stopped = true;
  try { await cdp.send("ServiceWorker.enable"); await cdp.send("ServiceWorker.stopAllWorkers"); } catch (e) { stopped = false; console.log("  (could not stop worker through CDP: " + e.message + ")"); }
  await sleep(1200);
  const alive = ctx.serviceWorkers().length;
  console.log("  service workers alive after stop: " + alive + (stopped ? "" : " (stop not supported)"));
  const nH = mock.requests.length;
  await page.getByRole("link", { name: "Pay Bill" }).click();
  await until(() => page.url().endsWith("/pay"), 8000, "navigation to /pay");
  await until(async () => (await rootCount(page)) === 1, 9000, "widget on /pay after worker restart");
  await until(() => mock.requests.length > nH, 9000, "AI request after worker restart");
  check("journey continues after the service worker was stopped", true);
  await until(async () => /खाता|account/i.test(await nowText(page)), 9000, "type step after restart");
  check("correct next step after the restart", /खाता|account/i.test(await nowText(page)), await nowText(page));
  const rH = mock.requests[mock.requests.length - 1];
  check("done-list survived the restart", rH.done.length >= 1, JSON.stringify(rH.done));

  check("no uncaught page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
  site.close(); proxy.close();
  console.log("\n" + (failures ? failures + " CHECK(S) FAILED" : "ALL CHECKS PASSED"));
  process.exit(failures ? 1 : 0);
})().catch(async (e) => {
  console.error("\nE2E2 CRASHED:", e.message);
  try { await ctx.close(); } catch (x) {}
  process.exit(2);
});
