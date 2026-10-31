/*
 * Saarthi proxy: worker.js  (Cloudflare Worker)
 *
 * ONE job: POST /api/next-step
 *   in : the request built by the extension's background.js  { v:1, goal, lang, page, items, done }
 *   out: { step: { itemId, action, text_en, text_hi, why_en, why_hi, risk, isPayment } }
 *
 * The Gemini API key lives ONLY here, as a Cloudflare secret named GEMINI_API_KEY
 *   (npx wrangler secret put GEMINI_API_KEY). It is never in the extension,
 *   never in a file, never in a reply.
 *
 * WHAT THIS FILE DOES, IN ORDER
 *   1. Only accepts POST /api/next-step (plus GET /health).
 *   2. Optional origin allow-list, per-IP rate limit, body size limit.
 *   3. Cleans the request AGAIN (the proxy address is public, so anybody could
 *      call it, not only the extension).
 *   4. Asks Gemini (prompt.js), retries once if Gemini hiccups.
 *   5. Checks Gemini's answer. It must point at a real, enabled control; secret
 *      fields become "manual"; the risk level can be raised but never lowered;
 *      web addresses and control characters are stripped.
 *   6. If Gemini gives an unusable answer, replies with a polite "manual" step
 *      instead of an error. Real outages become HTTP errors (429 / 502 / 504).
 *
 * Nothing the person typed or any page content is logged here.
 */
import {
  SYSTEM_PROMPT,
  RESPONSE_SCHEMA,
  SCHEMA_IN_WORDS,
  ACTIONS,
  buildUserPrompt
} from "./prompt.js";

/* ------------------------------------------------------------------ */
/* Limits (match the extension's limits in background.js)             */
/* ------------------------------------------------------------------ */
const MAX_BODY_BYTES = 40000;   // the extension keeps its own body under 30000
const MAX_ITEMS = 80;
const MAX_DONE = 30;
const MAX_ID = 200;
const GEMINI_TOTAL_MS = 22000;  // the extension gives up at 25000
const GEMINI_FIRST_MS = 14000;
const DEFAULT_RATE_PER_MIN = 30;
const DEFAULT_MODEL = "gemini-3-flash-preview";
const DEFAULT_API_BASE = "https://generativelanguage.googleapis.com";

const NEEDS_ITEM = ["click", "type", "select"];
const FIELD_KINDS = ["input", "textarea", "select", "checkbox", "radio"];

/* ------------------------------------------------------------------ */
/* Text cleaning                                                      */
/* ------------------------------------------------------------------ */
const LONG_NUMBER = /\p{Nd}(?:[\s.\-]?\p{Nd}){5,}/gu;
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤﻿]/g;
const URL_LIKE = /(?:https?:\/\/|www\.)\S+/gi;
const EMAIL_LIKE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

// Text coming IN to the proxy (from the extension or anyone else).
export function cleanIn(value, max) {
  return String(value == null ? "" : value)
    .replace(CONTROL_CHARS, " ")
    .replace(LONG_NUMBER, "…")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// Text coming OUT of Gemini, on its way to the person's screen.
export function cleanAi(value, max) {
  return String(value == null ? "" : value)
    .replace(CONTROL_CHARS, " ")
    .replace(URL_LIKE, "")
    .replace(EMAIL_LIKE, "")
    .replace(LONG_NUMBER, "…")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/* ------------------------------------------------------------------ */
/* Request validation                                                 */
/* ------------------------------------------------------------------ */
// Returns { ok:true, req } or { ok:false, status, error }.
export function validateRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return bad("bad_request");
  if (body.v !== 1) return bad("bad_version");

  const goal = cleanIn(body.goal, 300);
  if (!goal) return bad("no_goal");

  const page = body.page && typeof body.page === "object" ? body.page : {};
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : [];
  const items = [];
  const seen = new Set();
  for (const it of rawItems) {
    if (!it || typeof it !== "object") continue;
    const id = Number(it.id);
    if (!Number.isInteger(id) || id < 1 || id > MAX_ID || seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      kind: cleanIn(it.kind, 20),
      type: cleanIn(it.type, 20),
      text: cleanIn(it.text, 80),
      label: cleanIn(it.label, 80),
      area: cleanIn(it.area, 40),
      onScreen: it.onScreen === true,
      disabled: it.disabled === true
    });
  }
  const done = (Array.isArray(body.done) ? body.done : [])
    .slice(-MAX_DONE)
    .map((d) => cleanIn(d, 140))
    .filter(Boolean);

  if (items.length === 0 && done.length === 0) return bad("empty_page");

  const total = Number.isInteger(page.total) && page.total >= 0 && page.total < 100000 ? page.total : items.length;
  return {
    ok: true,
    req: {
      goal,
      lang: body.lang === "en" ? "en" : "hi",
      page: {
        host: cleanIn(page.host, 100).toLowerCase(),
        title: cleanIn(page.title, 120),
        screen: cleanIn(page.screen, 120),
        total
      },
      items,
      done
    }
  };
}
function bad(error) { return { ok: false, status: 400, error }; }

/* ------------------------------------------------------------------ */
/* Safety rules applied to the AI's answer                            */
/* ------------------------------------------------------------------ */
// Words that mean "this control moves money / is hard to undo".
// Controls whose own words say they SPEND money now: high risk + payment.
const PAY_NOW = /\b(pay\s*now|pay\s*(?:securely|online|₹|rs\.?|inr)|pay\s+[₹$]?\s*\p{Nd}|make\s+payment|confirm\s+(?:and\s+)?pay(?:ment)?|complete\s+(?:the\s+)?(?:payment|purchase|order)|place\s+order|buy\s*now|purchase|checkout|check\s*out|donate|transfer|send\s*money|recharge\s*now|top[\s-]?up\s*now)\b|अभी\s*भुगतान|भुगतान\s*करें|पेमेंट\s*करें|अभी\s*चुकाएं|अभी\s*चुकाएँ|ट्रांसफर|दान\s*करें/iu;
// Words that only MENTION payment ("Pay Bill", "Payment history"): the AI decides, but not low.
const PAY_WORDS = /\b(pay(?:ment)?|autopay|nach|e-?mandate|recharge)\b|भुगतान|पेमेंट|चुकाएं|चुकाएँ|रिचार्ज/i;
const DANGER_WORDS = /\b(delete|remove|close\s*account|deactivate|unsubscribe|withdraw|clear\s*all|erase)\b|हटाएं|हटाएँ|मिटाएं|मिटाएँ|निकासी/i;
const CANCEL_WORDS = /\b(cancel|discard|reset)\b|रद्द|बंद\s*करें/i;
// Going TO the payment page is not paying yet.
const TO_PAYMENT = /\b(proceed|continue|go|move)\s+(?:on\s+)?to\s+(?:pay(?:ment)?|checkout)\b/i;
const FINAL_WORDS = /\b(submit|confirm|finish|apply|register|sign\s*up|proceed|send|approve|authori[sz]e|accept|agree|continue\s*to\s*pay)\b|जमा|सबमिट|पुष्टि|भेजें|स्वीकार|आवेदन|रजिस्टर/i;
// A field that probably holds a secret even though the extension should already hide those.
const SECRET_WORDS = /otp|one[\s_-]?time|passw|passcode|\bpin\b|cvv|cvc|security[\s_-]?code|card[\s_-]?(?:number|no\b|num)|credit[\s_-]?card|debit[\s_-]?card|expiry|valid[\s_-]?thru|aadhaar|aadhar|पासवर्ड|ओटीपी|पिन|सीवीवी|कार्ड\s*(?:नंबर|नं)|आधार/i;
const POSTAL_HINT = /pin[\s_-]*code|pincode|postal|zip|पिन\s*कोड|पिनकोड/i;

const SECRET_TYPES = ["password"];

export function isSecretItem(item) {
  if (!item) return false;
  if (SECRET_TYPES.includes(String(item.type).toLowerCase())) return true;
  if (!FIELD_KINDS.includes(item.kind) && item.kind !== "other") return false;
  const bag = item.label + " " + item.text;
  return SECRET_WORDS.test(bag) && !POSTAL_HINT.test(bag);
}

const RISK_RANK = { low: 0, medium: 1, high: 2 };
const maxRisk = (a, b) => (RISK_RANK[a] >= RISK_RANK[b] ? a : b);

// The least risk a control may have, judged by its OWN words (not the AI's).
export function riskFloor(item, step) {
  let risk = "low";
  let payment = false;
  const words = item ? item.text + " " + item.label : "";
  if (item && step.action === "click") {
    if (TO_PAYMENT.test(words)) risk = "medium";
    else if (PAY_NOW.test(words)) { risk = "high"; payment = true; }
    else if (DANGER_WORDS.test(words)) risk = "high";
    else if (PAY_WORDS.test(words) || CANCEL_WORDS.test(words) || FINAL_WORDS.test(words)) risk = "medium";
  }
  return { risk, payment };
}

const FALLBACK = {
  en: "I could not work out the next step on this page. Please look at the page and choose the button yourself, or tell me your goal again.",
  hi: "मैं इस पेज पर अगला कदम नहीं समझ पाया। कृपया पेज देखकर खुद सही बटन चुनें, या अपना काम फिर से बताएँ।"
};
const SECRET_MANUAL = {
  en: "This box is private. Please type it yourself. Do not tell it to anyone.",
  hi: "यह जानकारी निजी है। कृपया इसे खुद भरें। किसी को न बताएँ।"
};

export function fallbackStep() {
  return {
    itemId: null,
    action: "manual",
    text_en: FALLBACK.en,
    text_hi: FALLBACK.hi,
    why_en: "",
    why_hi: "",
    risk: "low",
    isPayment: false
  };
}

// raw = what Gemini said (parsed JSON). Returns a safe step or null.
export function checkStep(raw, items) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  let action = ACTIONS.includes(raw.action) ? raw.action : null;
  if (!action) return null;

  // Find the control.
  let item = null;
  if (raw.itemId !== null && raw.itemId !== undefined && raw.itemId !== "") {
    const n = Number(raw.itemId);
    if (!Number.isInteger(n)) return null;
    item = items.find((it) => it.id === n) || null;
    if (!item) {
      if (NEEDS_ITEM.includes(action)) return null; // invented control
    }
  }
  if (NEEDS_ITEM.includes(action) && !item) return null;

  // Make the action word fit the control.
  if (item && NEEDS_ITEM.includes(action)) {
    if (item.kind === "select") action = "select";
    else if (item.kind === "input" || item.kind === "textarea") action = "type";
    else action = "click";
  }

  let en = cleanAi(raw.text_en, 240);
  let hi = cleanAi(raw.text_hi, 240);
  let whyEn = cleanAi(raw.why_en, 180);
  let whyHi = cleanAi(raw.why_hi, 180);

  // Secrets are always done by the person, privately.
  if (item && NEEDS_ITEM.includes(action) && isSecretItem(item)) {
    action = "manual";
    item = null;
    en = SECRET_MANUAL.en;
    hi = SECRET_MANUAL.hi;
    whyEn = "";
    whyHi = "";
  }

  // A disabled control cannot be used yet.
  if (item && NEEDS_ITEM.includes(action) && item.disabled) return null;

  if (!en && !hi) return null;
  if (!en) en = hi;
  if (!hi) hi = en;

  if (!NEEDS_ITEM.includes(action)) item = null;

  // Risk: the AI's opinion, never lower than what the control's own words say.
  const aiRisk = raw.risk === "high" || raw.risk === "medium" ? raw.risk : "low";
  const floor = riskFloor(item, { action });
  let risk = maxRisk(aiRisk, floor.risk);
  let isPayment = raw.isPayment === true || floor.payment;
  if (action === "click") {
    if (isPayment) risk = "high"; // a pay button is always high
  } else {
    // Only a press can pay. Typing, scrolling, waiting or finishing never does.
    isPayment = false;
    if (action !== "manual") risk = "low";
  }

  return {
    itemId: item ? item.id : null,
    action,
    text_en: en,
    text_hi: hi,
    why_en: whyEn,
    why_hi: whyHi,
    risk,
    isPayment
  };
}

/* ------------------------------------------------------------------ */
/* Gemini                                                             */
/* ------------------------------------------------------------------ */
// Pulls the JSON object out of the model's text (it may add code fences).
export function parseModelJson(text) {
  if (typeof text !== "string") return null;
  let t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try { return JSON.parse(t); } catch (e) { /* try the loose way */ }
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a !== -1 && b > a) {
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { /* give up */ }
  }
  return null;
}

function thinkingBudgetFor(env, model) {
  const v = env.THINKING_BUDGET;
  if (v !== undefined && v !== null && String(v).trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  // gemini-2.5-flash(-lite) may switch thinking off. Pro models may not.
  return /2\.5-flash/.test(model) ? 0 : null;
}

function buildGeminiBody(req, env, model, flags) {
  const userText = buildUserPrompt(req) + (flags.schema ? "" : "\n\n" + SCHEMA_IN_WORDS);
  const generationConfig = {
    maxOutputTokens: 1024,
    responseMimeType: "application/json"
  };
  // Gemini 3 works best at its default temperature; older models like it low.
  if (!/gemini-3/.test(model)) generationConfig.temperature = 0.2;
  if (flags.schema) generationConfig.responseSchema = RESPONSE_SCHEMA;
  const budget = thinkingBudgetFor(env, model);
  if (flags.thinking) {
    if (/gemini-3/.test(model) && budget === null) generationConfig.thinkingConfig = { thinkingLevel: "low" };
    else if (budget !== null) generationConfig.thinkingConfig = { thinkingBudget: budget };
  }
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig
  };
}

// Returns { kind:"ok", text } | { kind:"blocked" } | { kind:"empty" }
export function readGeminiText(data) {
  if (!data || typeof data !== "object") return { kind: "empty" };
  if (data.promptFeedback && data.promptFeedback.blockReason) return { kind: "blocked" };
  const cand = Array.isArray(data.candidates) ? data.candidates[0] : null;
  if (!cand) return { kind: "empty" };
  if (cand.finishReason === "SAFETY" || cand.finishReason === "PROHIBITED_CONTENT" || cand.finishReason === "RECITATION") {
    return { kind: "blocked" };
  }
  const parts = cand.content && Array.isArray(cand.content.parts) ? cand.content.parts : [];
  const text = parts.filter((p) => p && typeof p.text === "string" && p.thought !== true).map((p) => p.text).join("");
  return text.trim() ? { kind: "ok", text } : { kind: "empty" };
}

// Calls Gemini. Returns { ok:true, data } or { ok:false, status, error }.
async function callGemini(req, env) {
  const model = String(env.GEMINI_MODEL || DEFAULT_MODEL).replace(/[^\w.\-]/g, "");
  const base = String(env.GEMINI_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
  const url = base + "/v1beta/models/" + model + ":generateContent";
  const started = Date.now();
  // GEMINI_TOTAL_MS is only for tests; normally the defaults above are used.
  const total = Number(env.GEMINI_TOTAL_MS) > 0 ? Number(env.GEMINI_TOTAL_MS) : GEMINI_TOTAL_MS;
  const first = Math.min(GEMINI_FIRST_MS, Math.round(total * 0.65));
  const minLeft = Math.min(2500, Math.round(total / 4));
  const flags = { schema: true, thinking: true };
  let serverTries = 0;

  for (let attempt = 0; attempt < 4; attempt++) {
    const left = total - (Date.now() - started);
    if (left < minLeft) return { ok: false, status: 504, error: "timeout" };
    const timeout = Math.min(left, attempt === 0 ? first : left);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify(buildGeminiBody(req, env, model, flags)),
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timer);
      serverTries++;
      if (serverTries >= 2) {
        return error && error.name === "AbortError"
          ? { ok: false, status: 504, error: "timeout" }
          : { ok: false, status: 502, error: "upstream_network" };
      }
      continue;
    }

    try {
      if (res.ok) {
        let data = null;
        try { data = await res.json(); } catch (e) { data = null; }
        return { ok: true, data };
      }
      if (res.status === 429) return { ok: false, status: 429, error: "upstream_rate" };
      if (res.status === 401 || res.status === 403) return { ok: false, status: 502, error: "upstream_auth" };

      let message = "";
      try { message = (await res.text()).slice(0, 2000); } catch (e) { /* ignore */ }

      if (res.status === 400) {
        // Some models do not accept every option. Drop the option and retry.
        if (flags.thinking && /thinking/i.test(message)) { flags.thinking = false; continue; }
        if (flags.schema && /schema|propertyOrdering|response_?mime/i.test(message)) { flags.schema = false; continue; }
        return { ok: false, status: 502, error: "upstream_bad_request" };
      }
      if (res.status >= 500) {
        serverTries++;
        if (serverTries >= 2) return { ok: false, status: 502, error: "upstream_" + res.status };
        continue;
      }
      return { ok: false, status: 502, error: "upstream_" + res.status };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, status: 502, error: "upstream_failed" };
}

/* ------------------------------------------------------------------ */
/* HTTP plumbing                                                      */
/* ------------------------------------------------------------------ */
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Saarthi-Client",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin"
  };
  if (origin && originAllowed(origin, env)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(status, body, extra) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(extra || {})
    }
  });
}

// ALLOWED_ORIGINS = "" means anybody may call (fine while testing).
// Set it to your extension's origin once it has a fixed ID:
//   ALLOWED_ORIGINS = "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
// NOTE: a script outside a browser can fake the Origin header, so this keeps
// honest web pages out; the rate limit below is what protects your quota.
export function originAllowed(origin, env) {
  const list = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return true;
  return !!origin && list.includes(origin);
}

// Per-IP sliding window kept in this instance's memory. Cloudflare may run
// several instances, so this is approximate. For a hard limit add a
// [[unsafe.bindings]] rate limiter named RATE_LIMITER (see wrangler.toml).
const hits = new Map();
export function rateAllowed(key, limit, now) {
  const t = now === undefined ? Date.now() : now;
  const recent = (hits.get(key) || []).filter((x) => t - x < 60000);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retry: Math.max(1, Math.ceil((60000 - (t - recent[0])) / 1000)) };
  }
  recent.push(t);
  hits.set(key, recent);
  if (hits.size > 5000) { // keep memory small
    for (const [k, v] of hits) {
      if (!v.length || t - v[v.length - 1] >= 60000) hits.delete(k);
    }
    if (hits.size > 5000) hits.clear();
  }
  return { ok: true, retry: 0 };
}
export function _resetRateForTests() { hits.clear(); }

// Reads the body but stops if it is larger than max bytes.
async function readLimited(request, max) {
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > max) return { tooBig: true };
  if (!request.body) return { text: "" };
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      try { await reader.cancel(); } catch (e) { /* ignore */ }
      return { tooBig: true };
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.byteLength; }
  return { text: new TextDecoder().decode(all) };
}

export async function handleNextStep(request, env) {
  const cors = corsHeaders(request, env);
  const reply = (status, body, extra) => {
    const r = json(status, body, { ...cors, ...(extra || {}) });
    return r;
  };

  // Who is calling?
  const origin = request.headers.get("Origin");
  if (String(env.ALLOWED_ORIGINS || "").trim() && !originAllowed(origin, env)) {
    return reply(403, { error: "origin_not_allowed" });
  }
  const client = request.headers.get("X-Saarthi-Client") || "";
  if (!/^ext\//.test(client)) return reply(403, { error: "client_not_allowed" });

  // How often?
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function") {
    try {
      const out = await env.RATE_LIMITER.limit({ key: ip });
      if (out && out.success === false) return reply(429, { error: "rate" }, { "Retry-After": "30" });
    } catch (e) { /* the binding failed: fall back to the memory limiter below */ }
  }
  const perMin = Number(env.RATE_PER_MIN) > 0 ? Number(env.RATE_PER_MIN) : DEFAULT_RATE_PER_MIN;
  const rate = rateAllowed(ip, perMin);
  if (!rate.ok) return reply(429, { error: "rate" }, { "Retry-After": String(rate.retry) });

  // What was sent?
  const type = (request.headers.get("Content-Type") || "").toLowerCase();
  if (!type.includes("application/json")) return reply(415, { error: "json_only" });
  const body = await readLimited(request, MAX_BODY_BYTES);
  if (body.tooBig) return reply(413, { error: "too_big" });
  let parsed;
  try { parsed = JSON.parse(body.text); } catch (e) { return reply(400, { error: "bad_json" }); }
  const checked = validateRequest(parsed);
  if (!checked.ok) return reply(checked.status, { error: checked.error });

  if (!env.GEMINI_API_KEY) {
    console.log("saarthi: GEMINI_API_KEY is not set");
    return reply(500, { error: "not_configured" });
  }

  // Ask the AI.
  const ai = await callGemini(checked.req, env);
  if (!ai.ok) {
    console.log("saarthi: gemini failed", ai.error);
    return reply(ai.status, { error: ai.error }, ai.status === 429 ? { "Retry-After": "20" } : {});
  }

  const got = readGeminiText(ai.data);
  let step = null;
  if (got.kind === "ok") step = checkStep(parseModelJson(got.text), checked.req.items);
  if (!step) {
    console.log("saarthi: unusable AI answer", got.kind);
    return reply(200, { step: fallbackStep(), fallback: true });
  }
  return reply(200, { step });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (path === "/health" && request.method === "GET") {
      return json(200, { ok: true, service: "saarthi-proxy", model: String(env.GEMINI_MODEL || DEFAULT_MODEL), configured: !!env.GEMINI_API_KEY });
    }
    if (path === "/api/next-step") {
      if (request.method !== "POST") return json(405, { error: "method_not_allowed" }, { Allow: "POST, OPTIONS" });
      try {
        return await handleNextStep(request, env);
      } catch (error) {
        console.log("saarthi: internal error", error && error.name);
        return json(500, { error: "internal" });
      }
    }
    return json(404, { error: "not_found" });
  }
};
