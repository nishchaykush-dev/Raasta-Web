/*
 * Saarthi extension: background service worker (file: background.js)
 * Version 0.7.0
 *
 * FOUR JOBS
 *  1. Toolbar icon: turns Saarthi ON / OFF for ONE tab (badge "ON").
 *  2. After every page load in an ON tab it injects raasta.js, so Saarthi
 *     (and the goal) follows the person from page to page and site to site.
 *  3. Keeps the goal of each tab in chrome.storage.session (browser memory,
 *     gone when the browser closes). The website itself can never read it.
 *  4. The ONLY place that talks to the internet. raasta.js sends it a list of
 *     button names; this file checks them, asks the AI proxy, checks the
 *     answer, and hands back ONE step. The AI key is NOT here. It lives in
 *     the proxy (see PROXY_URL).
 *
 * PRIVACY RULES THIS FILE ENFORCES (even if raasta.js had a bug)
 *  - No AI request is made until the person has agreed (CONSENT_KEY = "yes").
 *  - Long digit runs (card, Aadhaar, phone...) are masked before sending.
 *  - Only the website's host name is sent, never the full address.
 *  - A tab that is OFF cannot use the AI or store a goal.
 *  - The AI's answer is accepted only if it points at a button that was
 *    really in the list. Anything else is thrown away.
 *  - Max 20 AI calls per minute per tab, so a loop cannot burn the quota.
 */
"use strict";

// >>> PUT THE ADDRESS OF YOUR DEPLOYED PROXY HERE (Cloudflare Worker etc.) <<<
// The AI key lives inside the proxy, never in the extension.
const PROXY_URL = "https://YOUR-SAARTHI-PROXY.example.workers.dev/api/next-step";

const VERSION = "0.7.0";
const DEV_PROXY_KEY = "saarthi-dev-proxy"; // for testing: chrome.storage.local value that replaces PROXY_URL
const CONSENT_KEY = "saarthi-ai-consent-v1"; // set to "yes" by raasta.js when the person agrees
const TASK_KEY = "saarthi-task-v2";
const SESSION_KEYS = [TASK_KEY]; // the only keys a page may keep per tab
const AI_TIMEOUT_MS = 25000;
const MAX_BODY_BYTES = 30000;
const MAX_ITEMS = 80;
const MAX_DONE = 30;
const MAX_CALLS_PER_MIN = 20;
const ACTIONS = ["click", "type", "select", "manual", "scroll", "wait", "done"];
const NEEDS_ITEM = ["click", "type", "select"];

/* ------------------------------------------------------------------ */
/* Small helpers                                                      */
/* ------------------------------------------------------------------ */
const LONG_NUMBER = /\p{Nd}(?:[\s.\-]?\p{Nd}){5,}/gu;

// Text going OUT: one line, long numbers masked, length-limited.
function cleanOut(value, max) {
  return String(value == null ? "" : value)
    .replace(LONG_NUMBER, "…")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// Text coming IN from the AI: shown as plain text by raasta.js (never HTML).
function cleanIn(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// Only normal web pages. Chrome's own pages and web stores cannot be injected.
function injectable(url) {
  if (!/^https?:\/\//i.test(url || "")) return false;
  return !/^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore|microsoftedge\.microsoft\.com\/addons)/i.test(url);
}

function hostOf(url) {
  try { return new URL(url).hostname; } catch (error) { return ""; }
}

/* ------------------------------------------------------------------ */
/* Per-tab state (chrome.storage.session survives the service worker  */
/* going to sleep; it is cleared when the browser closes)             */
/* ------------------------------------------------------------------ */
const onKey = (id) => "on:" + id;
const sessKey = (id) => "sess:" + id;

async function isOn(tabId) {
  const got = await chrome.storage.session.get(onKey(tabId));
  return got[onKey(tabId)] === true;
}
async function setOn(tabId, on) {
  if (on) await chrome.storage.session.set({ [onKey(tabId)]: true });
  else await chrome.storage.session.remove(onKey(tabId));
}
async function readSession(tabId) {
  const got = await chrome.storage.session.get(sessKey(tabId));
  return got[sessKey(tabId)] || {};
}
async function writeSession(tabId, values) {
  await chrome.storage.session.set({ [sessKey(tabId)]: values });
}

async function paintBadge(tabId, on) {
  try {
    await chrome.action.setBadgeText({ tabId: tabId, text: on ? "ON" : "" });
    if (on) {
      await chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#1a7f37" });
      if (chrome.action.setBadgeTextColor) await chrome.action.setBadgeTextColor({ tabId: tabId, color: "#ffffff" });
    }
    await chrome.action.setTitle({
      tabId: tabId,
      title: on ? "Saarthi is ON for this tab. Click to turn it OFF." : "Saarthi: click to turn ON for this tab"
    });
  } catch (error) { /* the tab may have just closed */ }
}

/* ------------------------------------------------------------------ */
/* Start / stop Saarthi inside a tab                                  */
/* ------------------------------------------------------------------ */
// raasta.js ignores a second start, so running this again is harmless.
async function startInTab(tabId) {
  await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ["raasta.js"] });
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => { try { if (window.Saarthi) window.Saarthi.setEnabled(true); } catch (error) { /* ignore */ } }
  });
}
async function stopInTab(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => { try { if (window.Saarthi) window.Saarthi.setEnabled(false); } catch (error) { /* ignore */ } }
  });
}

// Toolbar click. Returns a small result so tests can check it.
async function toggleTab(tab) {
  const id = tab && tab.id;
  if (id === undefined || id === null) return { ok: false, reason: "no_tab" };
  const turnOn = !(await isOn(id));

  if (turnOn && !injectable(tab.url)) {
    // Chrome's own pages: show a short "not here" badge instead of failing silently.
    try {
      await chrome.action.setBadgeText({ tabId: id, text: "×" });
      await chrome.action.setBadgeBackgroundColor({ tabId: id, color: "#b42318" });
      setTimeout(() => paintBadge(id, false), 2500);
    } catch (error) { /* ignore */ }
    return { ok: false, reason: "not_allowed" };
  }

  await setOn(id, turnOn);
  await paintBadge(id, turnOn);
  try {
    if (turnOn) {
      await startInTab(id);
    } else {
      await stopInTab(id);
      await chrome.storage.session.remove(sessKey(id)); // turning OFF forgets the goal
    }
  } catch (error) {
    return { ok: false, reason: "inject_failed", on: turnOn };
  }
  return { ok: true, on: turnOn };
}

chrome.action.onClicked.addListener((tab) => { toggleTab(tab); });

// Page loads inside an ON tab: put Saarthi back.
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== "loading" && info.status !== "complete") return;
  try {
    if (!(await isOn(tabId))) return;
    await paintBadge(tabId, true); // the badge is reset by Chrome on every navigation
    if (info.status === "complete" && injectable(tab && tab.url)) await startInTab(tabId);
  } catch (error) { /* page not injectable right now */ }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove([onKey(tabId), sessKey(tabId)]);
});

/* ------------------------------------------------------------------ */
/* The AI call                                                        */
/* ------------------------------------------------------------------ */
async function proxyUrl() {
  try {
    const got = await chrome.storage.local.get(DEV_PROXY_KEY);
    const dev = got[DEV_PROXY_KEY];
    if (typeof dev === "string" && /^https?:\/\//i.test(dev)) return dev;
  } catch (error) { /* ignore */ }
  return PROXY_URL.indexOf("YOUR-") === -1 ? PROXY_URL : "";
}

const calls = new Map(); // tabId -> times of recent AI calls
function rateAllowed(tabId) {
  const now = Date.now();
  const recent = (calls.get(tabId) || []).filter((t) => now - t < 60000);
  if (recent.length >= MAX_CALLS_PER_MIN) { calls.set(tabId, recent); return false; }
  recent.push(now);
  calls.set(tabId, recent);
  return true;
}

// What is sent to the proxy. Built from scratch: nothing extra can slip in.
function buildRequest(payload, pageUrl) {
  const p = payload && typeof payload === "object" ? payload : {};
  const page = p.page && typeof p.page === "object" ? p.page : {};
  const rawItems = Array.isArray(p.items) ? p.items.slice(0, MAX_ITEMS) : [];
  const items = [];
  rawItems.forEach((it) => {
    const id = Number(it && it.id);
    if (!Number.isInteger(id) || id < 1 || id > 200) return;
    items.push({
      id: id,
      kind: cleanOut(it.kind, 20),
      type: cleanOut(it.type, 20),
      text: cleanOut(it.text, 80),
      label: cleanOut(it.label, 80),
      area: cleanOut(it.area, 40),
      onScreen: it.onScreen === true,
      disabled: it.disabled === true
    });
  });
  const done = (Array.isArray(p.done) ? p.done : []).slice(-MAX_DONE).map((d) => cleanOut(d, 140)).filter(Boolean);

  const request = {
    v: 1,
    goal: cleanOut(p.goal, 300),
    lang: p.lang === "en" ? "en" : "hi",
    page: {
      host: hostOf(pageUrl),
      title: cleanOut(page.title, 120),
      screen: cleanOut(page.screen, 120),
      total: Number.isInteger(page.total) ? page.total : items.length
    },
    items: items,
    done: done
  };
  // Keep the body small: drop the least important (last) items until it fits.
  while (new TextEncoder().encode(JSON.stringify(request)).length > MAX_BODY_BYTES && request.items.length > 5) {
    request.items.pop();
  }
  return request;
}

// What comes back. Only a known, checked shape is passed on.
function sanitizeStep(raw, items) {
  if (!raw || typeof raw !== "object") return null;
  const action = ACTIONS.indexOf(raw.action) !== -1 ? raw.action : null;
  if (!action) return null;

  let itemId = null;
  if (raw.itemId !== null && raw.itemId !== undefined) {
    const n = Number(raw.itemId);
    if (!Number.isInteger(n) || !items.some((it) => it.id === n)) return null; // invented button
    itemId = n;
  }
  if (NEEDS_ITEM.indexOf(action) !== -1 && itemId === null) return null;
  if (NEEDS_ITEM.indexOf(action) === -1) itemId = null;

  let en = cleanIn(raw.text_en, 260);
  let hi = cleanIn(raw.text_hi, 260);
  if (!en && !hi) return null;
  if (!en) en = hi;
  if (!hi) hi = en;

  const risk = raw.risk === "high" || raw.risk === "medium" ? raw.risk : "low";
  return {
    itemId: itemId,
    action: action,
    text_en: en,
    text_hi: hi,
    why_en: cleanIn(raw.why_en, 200),
    why_hi: cleanIn(raw.why_hi, 200),
    risk: risk,
    isPayment: raw.isPayment === true
  };
}

async function handleAiNext(payload, tab) {
  const tabId = tab && tab.id;
  const got = await chrome.storage.local.get(CONSENT_KEY);
  if (got[CONSENT_KEY] !== "yes") return { ok: false, error: "consent" };

  const url = await proxyUrl();
  if (!url) return { ok: false, error: "not_configured" };
  if (!rateAllowed(tabId)) return { ok: false, error: "rate" };

  const request = buildRequest(payload, tab && tab.url);
  if (!request.goal) return { ok: false, error: "no_goal" };
  if (request.items.length === 0 && request.done.length === 0) return { ok: false, error: "empty_page" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Saarthi-Client": "ext/" + VERSION },
        body: JSON.stringify(request),
        signal: controller.signal,
        credentials: "omit",
        cache: "no-store"
      });
    } catch (error) {
      return { ok: false, error: error && error.name === "AbortError" ? "timeout" : "network" };
    }
    if (response.status === 429) return { ok: false, error: "rate" };
    if (!response.ok) return { ok: false, error: "proxy_" + response.status };

    let data;
    try { data = await response.json(); } catch (error) { return { ok: false, error: "bad_response" }; }
    const step = sanitizeStep(data && (data.step || data), request.items);
    if (!step) return { ok: false, error: "bad_response" };
    return { ok: true, step: step };
  } catch (error) {
    return { ok: false, error: error && error.name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Messages from raasta.js (content script)                           */
/* ------------------------------------------------------------------ */
async function handleMessage(msg, sender) {
  const tab = sender.tab;
  const tabId = tab && tab.id;
  if (tabId === undefined || tabId === null) return { ok: false, error: "no_tab" };

  if (msg.type === "saarthi:hello") {
    return { ok: true, version: VERSION, on: await isOn(tabId), aiConfigured: !!(await proxyUrl()) };
  }

  // Everything below is refused when the tab has been switched OFF.
  if (!(await isOn(tabId))) return { ok: false, error: "off" };

  if (msg.type === "saarthi:session:getAll") {
    return { ok: true, values: await readSession(tabId) };
  }
  if (msg.type === "saarthi:session:set") {
    if (SESSION_KEYS.indexOf(msg.key) === -1 || typeof msg.value !== "string" || msg.value.length > 8000) {
      return { ok: false, error: "bad_key" };
    }
    const values = await readSession(tabId);
    values[msg.key] = msg.value;
    await writeSession(tabId, values);
    return { ok: true };
  }
  if (msg.type === "saarthi:session:remove") {
    if (SESSION_KEYS.indexOf(msg.key) === -1) return { ok: false, error: "bad_key" };
    const values = await readSession(tabId);
    delete values[msg.key];
    await writeSession(tabId, values);
    return { ok: true };
  }
  if (msg.type === "saarthi:ai:next") {
    return handleAiNext(msg.payload, tab);
  }
  return { ok: false, error: "unknown_message" };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !msg || typeof msg.type !== "string") return false;
  handleMessage(msg, sender).then(sendResponse, () => sendResponse({ ok: false, error: "internal" }));
  return true; // the answer is sent later
});

// Lets the unit tests (Node) load this file. Ignored inside the browser.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { cleanOut, cleanIn, injectable, hostOf, buildRequest, sanitizeStep, rateAllowed, handleAiNext, handleMessage, toggleTab };
}
