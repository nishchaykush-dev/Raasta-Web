/*
 * Saarthi — Accessible website guidance widget (file: raasta.js)
 * Version: 0.3  (Step 7 safety fixes + Step 8 page reader)
 *
 * WHAT IT DOES (Step 7)
 * - Floating Saarthi button (84px, 76px on small phones)
 * - Panel built inside a Shadow DOM, so website styles cannot break it
 * - Hindi / English interface (choice is remembered between pages)
 * - Goal box, "Listen" (text-to-speech), "Where am I?", "What have I done?"
 * - Rasta/Saarthi ON/OFF switch support (see below)
 *
 * SAFETY RULES THIS FILE FOLLOWS
 * 1. It never reads what the user typed into the WEBSITE's own fields.
 * 2. The goal text is NEVER put in localStorage or in the history.
 *    It is kept only in sessionStorage (cleared when the tab closes,
 *    and after 30 minutes) so it can follow the user to the next page.
 * 3. Goals that look like an OTP, PIN, password, CVV or a long number
 *    (card, Aadhaar, phone, consumer no.) are refused, cleared and not stored.
 * 4. "Sab mita do" wipes history + saved goal + old v0.1 data.
 * 5. It does not change the website (no <html lang> change, no
 *    speechSynthesis.onvoiceschanged overwrite). It only points and explains.
 * 6. No libraries, no API keys, no network requests.
 *
 * ON / OFF SWITCH (for the demo portal)
 *   Turn OFF:  localStorage.setItem("saarthi-enabled", "off")  then reload,
 *              or call  Saarthi.setEnabled(false)  (no reload needed)
 *   Turn ON:   localStorage.setItem("saarthi-enabled", "on")   then reload,
 *              or call  Saarthi.setEnabled(true)
 *   When OFF the button and panel do not exist at all.
 *
 * SINGLE-FILE PORTALS (one HTML file with several "screens")
 *   Give each screen container  data-saarthi-screen="Pay Bill"  and
 *   "Where am I?" will name the screen that is visible right now.
 *   Without it, Saarthi uses the first visible <h1>, then the page title.
 *
 * PUBLIC API (window.Saarthi)
 *   isEnabled(), setEnabled(bool), open(), close(),
 *   logStep(title, icon)   -> add a finished step to "What have I done?"
 *                              title may be a string or {hi:"...", en:"..."}
 *   clearAll()             -> same as the "Sab mita do" button
 *   readPage({goal, max})  -> STEP 8: list of what can be pressed on the page
 *                              (labels only, never typed values, max 60)
 *   debugPage({goal})      -> same list printed as a table in the console
 *   pageJSON({goal})       -> same list as a JSON string (to paste into AI Studio)
 *
 * KEEP AN ELEMENT OUT OF THE LIST (for example your own ON/OFF switch):
 *   add the attribute  data-saarthi-ignore  to it.
 *
 * Written to run on older phone browsers: no optional chaining (?.),
 * no regex look-behind, no replaceChildren().
 */
(() => {
  "use strict";

  const VERSION = "0.3";
  const ROOT_ID = "saarthi-root";
  const HISTORY_KEY = "saarthi-history-v2";   // localStorage (no typed text)
  const TASK_KEY = "saarthi-task-v2";         // sessionStorage only
  const LANG_KEY = "saarthi-lang";            // localStorage (preference)
  const FLAG_KEY = "saarthi-enabled";         // localStorage ("off" = hidden)
  const LEGACY_KEYS = [
    "saarthi-history-v1",
    "saarthi-chat-v1",
    "saarthi-task-v1"
  ];
  const MAX_HISTORY = 50;
  const TASK_TTL_MS = 30 * 60 * 1000;
  const SPEECH_CHUNK_MAX = 160;

  // Do not start twice if the script is loaded twice.
  if (window.Saarthi || document.getElementById(ROOT_ID)) return;

  /* ------------------------------------------------------------------ */
  /* Safe storage helpers (storage can be blocked or full)              */
  /* ------------------------------------------------------------------ */
  function storageGet(area, key) {
    try { return window[area].getItem(key); } catch (error) { return null; }
  }
  function storageSet(area, key, value) {
    try { window[area].setItem(key, value); return true; }
    catch (error) { return false; }
  }
  function storageRemove(area, key) {
    try { window[area].removeItem(key); return true; }
    catch (error) { return false; }
  }

  function readEnabled() {
    const value = storageGet("localStorage", FLAG_KEY);
    return !(value === "off" || value === "false" || value === "0");
  }
  function writeEnabled(on) {
    return storageSet("localStorage", FLAG_KEY, on ? "on" : "off");
  }
  function readLanguage() {
    return storageGet("localStorage", LANG_KEY) === "en" ? "en" : "hi";
  }

  // Remove everything Saarthi may have stored. Used by "Sab mita do" and
  // once at start-up to delete v0.1 data (which contained typed goals).
  function wipeStoredData() {
    storageRemove("localStorage", HISTORY_KEY);
    LEGACY_KEYS.forEach((key) => storageRemove("localStorage", key));
    storageRemove("sessionStorage", TASK_KEY);
  }
  function wipeLegacyData() {
    LEGACY_KEYS.forEach((key) => storageRemove("localStorage", key));
  }

  /* ------------------------------------------------------------------ */
  /* Sensitive-text check (OTP, PIN, password, long numbers)            */
  /* ------------------------------------------------------------------ */
  const SECRET_WORDS = [
    "otp", "pin", "cvv", "cvc", "password", "passcode",
    "पासवर्ड", "ओटीपी", "पिन", "सीवीवी"
  ];
  // 6 or more digits in a row, allowing spaces, dots or dashes between them.
  const LONG_NUMBER = /\p{Nd}(?:[\s.\-]?\p{Nd}){5,}/u;
  const LONG_NUMBER_GLOBAL = /\p{Nd}(?:[\s.\-]?\p{Nd}){5,}/gu;

  function looksSensitive(text) {
    const value = String(text || "");
    if (LONG_NUMBER.test(value)) return true;
    const words = value.toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u)
      .filter((word) => word !== "");
    const hasDigits = /\p{Nd}/u.test(value);
    for (let i = 0; i < words.length; i++) {
      if (SECRET_WORDS.indexOf(words[i]) === -1) continue;
      // "PIN code" / "पिन कोड" means a postal code, not a secret PIN.
      const next = words[i + 1];
      const postal = (words[i] === "pin" || words[i] === "पिन") &&
        (next === "code" || next === "कोड") && !hasDigits;
      if (!postal) return true;
    }
    return false;
  }

  function normalizeSpaces(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }
  function truncate(text, max) {
    return text.length > max ? text.slice(0, max - 1) + "…" : text;
  }
  function maskNumbers(text, replacement) {
    return String(text).replace(LONG_NUMBER_GLOBAL, replacement);
  }

  /* ------------------------------------------------------------------ */
  /* Text (Hindi + English)                                             */
  /* ------------------------------------------------------------------ */
  const translations = {
    hi: {
      title: "सारथी",
      subtitle: "आपका डिजिटल साथी",
      goalLabel: "आप क्या करना चाहते हैं?",
      goalPlaceholder: "जैसे: मुझे यह फॉर्म भरना है",
      privacyNote: "यहाँ OTP, PIN, पासवर्ड या कार्ड नंबर न लिखें।",
      startTask: "काम शुरू करें",
      listen: "निर्देश सुनें",
      where: "मैं कहाँ हूँ?",
      history: "मैंने क्या किया?",
      close: "बंद करें",
      language: "English",
      welcome:
        "नमस्ते! मैं सारथी हूँ। बताइए, आप इस वेबसाइट पर क्या करना चाहते हैं?",
      emptyGoal: "पहले बताइए कि आप क्या करना चाहते हैं।",
      sensitiveGoal:
        "सुरक्षा के लिए यहाँ OTP, PIN, पासवर्ड या लंबे नंबर न लिखें। " +
        "बस इतना बताइए कि आप क्या करना चाहते हैं।",
      goalReceived: (goal) =>
        `आप यह करना चाहते हैं: ${goal}। ` +
        "मैंने आपकी बात दर्ज कर ली है। " +
        "वेबसाइट पर अगले कदम बताने की सुविधा अभी तैयार हो रही है।",
      currentPage: (name) =>
        `आप अभी "${name}" नाम के पेज पर हैं। ` +
        "यह जानकारी पेज के शीर्षक से मिली है। " +
        "मैंने अभी पेज की पूरी सामग्री नहीं समझी है।",
      untitled: "बिना नाम वाला पेज",
      numberHidden: "(नंबर छिपा है)",
      historyTitle: "आपकी पिछली गतिविधियाँ",
      historyEmpty: "अभी कोई गतिविधि दर्ज नहीं है।",
      historyGoal: "लक्ष्य बताया",
      clearAll: "सब मिटा दो",
      confirmClear:
        "क्या आप सारा इतिहास और सहेजा हुआ काम मिटाना चाहते हैं?",
      confirmYes: "हाँ, मिटा दो",
      confirmNo: "नहीं, रहने दो",
      allCleared: "सब कुछ मिटा दिया गया है।",
      back: "वापस जाएँ",
      launcherLabel: "सारथी खोलें",
      panelLabel: "सारथी डिजिटल सहायक",
      audioStarting: "आवाज़ शुरू हो रही है…",
      audioPlaying: "निर्देश सुनाए जा रहे हैं…",
      audioDone: "आवाज़ पूरी हुई।",
      speechUnavailable:
        "आपके ब्राउज़र में आवाज़ की सुविधा उपलब्ध नहीं है। कृपया संदेश पढ़ें।",
      speechError:
        "अभी आवाज़ नहीं चल पाई। आप स्क्रीन पर दिया गया संदेश पढ़ सकते हैं।",
      noVoice:
        "इस फ़ोन में हिंदी आवाज़ नहीं मिली। कृपया संदेश पढ़ें, " +
        "या फ़ोन की सेटिंग में हिंदी आवाज़ जोड़ें।",
      storageFailed: "इतिहास सेव नहीं हो पाया।"
    },
    en: {
      title: "Saarthi",
      subtitle: "Your digital companion",
      goalLabel: "What would you like to do?",
      goalPlaceholder: "For example: Help me fill this form",
      privacyNote: "Do not type an OTP, PIN, password or card number here.",
      startTask: "Start this task",
      listen: "Listen to guidance",
      where: "Where am I?",
      history: "What have I done?",
      close: "Close",
      language: "हिंदी",
      welcome:
        "Hello! I am Saarthi. Tell me what you would like to do on this website.",
      emptyGoal: "Please tell me what you would like to do first.",
      sensitiveGoal:
        "For your safety, please do not type an OTP, PIN, password or a long " +
        "number here. Just tell me what you would like to do.",
      goalReceived: (goal) =>
        `You want to: ${goal}. ` +
        "I have noted your goal. " +
        "The feature that tells you the next steps on this website is " +
        "still being built.",
      currentPage: (name) =>
        `You are on the page named "${name}". ` +
        "This comes from the page heading. " +
        "I have not yet understood the full page contents.",
      untitled: "an untitled page",
      numberHidden: "(number hidden)",
      historyTitle: "Your recent activity",
      historyEmpty: "No activity has been recorded yet.",
      historyGoal: "Goal set",
      clearAll: "Clear everything",
      confirmClear:
        "Do you want to clear all history and the saved task?",
      confirmYes: "Yes, clear it",
      confirmNo: "No, keep it",
      allCleared: "Everything has been cleared.",
      back: "Go back",
      launcherLabel: "Open Saarthi",
      panelLabel: "Saarthi digital assistant",
      audioStarting: "Starting audio…",
      audioPlaying: "Playing guidance…",
      audioDone: "Audio finished.",
      speechUnavailable:
        "Speech is unavailable in this browser. Please read the message on screen.",
      speechError:
        "Speech could not play right now. You can read the message on screen.",
      noVoice:
        "No English voice was found on this device. Please read the message " +
        "on screen.",
      storageFailed: "History could not be saved."
    }
  };

  /* ------------------------------------------------------------------ */
  /* Reading the page name (title only; never typed values)             */
  /* ------------------------------------------------------------------ */
  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    if (typeof el.checkVisibility === "function") {
      try {
        if (!el.checkVisibility({
          checkVisibilityCSS: true,
          visibilityProperty: true
        })) return false;
      } catch (error) { /* fall through to the manual check */ }
    }
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return el.getClientRects().length > 0;
  }

  const EMOJI = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu;

  function cleanScreenName(text) {
    return truncate(normalizeSpaces(String(text || "").replace(EMOJI, "")), 80);
  }

  // Returns the name of what is on screen right now.
  // Order: data-saarthi-screen > first visible <h1> > page title.
  function getScreenName() {
    const marked = document.querySelectorAll("[data-saarthi-screen]");
    for (let i = 0; i < marked.length; i++) {
      if (!isVisible(marked[i])) continue;
      const name = cleanScreenName(marked[i].getAttribute("data-saarthi-screen"));
      if (name) return name;
    }
    const headings = document.querySelectorAll(
      "h1, [role='heading'][aria-level='1']"
    );
    for (let i = 0; i < headings.length; i++) {
      if (!isVisible(headings[i])) continue;
      const name = cleanScreenName(headings[i].textContent);
      if (name) return name;
    }
    return cleanScreenName(document.title);
  }

  /* ------------------------------------------------------------------ */
  /* STEP 8: Page reader. Lists what can be pressed on the page.        */
  /* It reads LABELS only. It never reads what anyone typed, never      */
  /* lists password / OTP / PIN / card fields, and never changes the    */
  /* page.                                                              */
  /* ------------------------------------------------------------------ */
  const MAX_ITEMS = 60;
  const MAX_CANDIDATES = 4000;

  const CLICKABLE_SELECTOR = [
    "a[href]", "button", "input", "select", "textarea", "summary",
    "[role='button']", "[role='link']", "[role='menuitem']", "[role='tab']",
    "[role='checkbox']", "[role='radio']", "[role='switch']",
    "[role='option']", "[onclick]"
  ].join(",");

  // Field labels / names that mean "secret". A match hides the field.
  const SECRET_FIELD_TEXT =
    /otp|one[\s_-]?time|passw|passcode|cvv|cvc|security[\s_-]?code|credit[\s_-]?card|debit[\s_-]?card|expiry|expiration|valid[\s_-]?thru|upi[\s_-]?pin/i;
  const CARD_NUMBER = /card[\s_-]?(?:number|no\b|num)/i;
  // "Aadhaar card number", "Ration card number" are ID cards, not payment cards.
  const NON_PAYMENT_CARD =
    /aadhaar|aadhar|\bpan\b|ration|voter|identity|\bid\b|health|ayushman|kisan|smart/i;
  const PIN_WORD = /(?:^|[^a-z])pin(?![\s_-]*code)(?:[^a-z]|$)/i;
  const POSTAL_HINT = /pin[\s_-]*code|pincode|postal|zip/i;
  const SECRET_AUTOCOMPLETE = /one-time-code|current-password|new-password|^cc-/;

  const GOAL_STOPWORDS = [
    "the", "and", "for", "with", "from", "want", "need",
    "hai", "hain", "mujhe", "chahiye", "karna", "kar"
  ];

  function composedParent(node) {
    if (node.parentElement) return node.parentElement;
    const root = node.getRootNode ? node.getRootNode() : null;
    return root && root.host ? root.host : null;
  }

  // Text that belongs to the element itself: skips form controls (so the
  // options of a <select> or a typed value never leak in), hidden children
  // and decorative aria-hidden icons.
  function ownText(node) {
    let out = "";
    const kids = node.childNodes;
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i];
      if (child.nodeType === 3) {
        out += child.nodeValue + " ";
      } else if (child.nodeType === 1) {
        const tag = child.tagName;
        if (/^(SELECT|TEXTAREA|INPUT|BUTTON|SCRIPT|STYLE|OPTION|NOSCRIPT)$/.test(tag) &&
            child !== node) continue;
        if (child.getAttribute("aria-hidden") === "true") continue;
        if (child.hidden || (child.style && child.style.display === "none")) continue;
        if (tag === "IMG") { out += (child.getAttribute("alt") || "") + " "; continue; }
        out += ownText(child) + " ";
      }
    }
    return out;
  }

  function inputTypeOf(el) {
    return (el.getAttribute("type") || "text").toLowerCase();
  }

  function kindOf(el) {
    const tag = el.tagName.toLowerCase();
    const role = (el.getAttribute("role") || "").toLowerCase();
    if (tag === "a") return "link";
    if (tag === "button") return "button";
    if (tag === "summary") return "summary";
    if (tag === "select") return "select";
    if (tag === "textarea") return "textarea";
    if (tag === "input") {
      const type = inputTypeOf(el);
      if (type === "submit" || type === "button" || type === "reset" ||
          type === "image") return "button";
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio";
      return "input";
    }
    if (role === "button" || role === "link" || role === "menuitem" ||
        role === "tab" || role === "checkbox" || role === "radio" ||
        role === "switch" || role === "option") return role;
    return "other";
  }

  // The accessible name of a control: aria-label, aria-labelledby or a
  // <label>. Never the control's own value.
  function accessibleLabel(el) {
    const parts = [];
    const aria = el.getAttribute("aria-label");
    if (aria) parts.push(aria);
    const by = el.getAttribute("aria-labelledby");
    if (by) {
      const root = el.getRootNode();
      by.split(/\s+/).forEach((id) => {
        const ref = root && typeof root.getElementById === "function"
          ? root.getElementById(id) : null;
        if (ref) parts.push(ownText(ref));
      });
    }
    if (el.labels) {
      for (let i = 0; i < el.labels.length; i++) parts.push(ownText(el.labels[i]));
    }
    return normalizeSpaces(parts.join(" "));
  }

  function isSecretField(el, kind, labelText) {
    const tag = el.tagName.toLowerCase();
    const isField = tag === "input" || tag === "textarea" || tag === "select" ||
      el.isContentEditable === true;
    if (!isField) return false;

    const type = inputTypeOf(el);
    if (tag === "input" && type === "password") return true;
    const autocomplete = (el.getAttribute("autocomplete") || "").toLowerCase();
    if (SECRET_AUTOCOMPLETE.test(autocomplete)) return true;

    const bag = [
      el.id, el.getAttribute("name"), autocomplete,
      el.getAttribute("aria-label"), el.getAttribute("placeholder"),
      el.getAttribute("title"), labelText
    ].join(" ");
    if (SECRET_FIELD_TEXT.test(bag) || PIN_WORD.test(bag)) return true;
    if (CARD_NUMBER.test(bag) && !NON_PAYMENT_CARD.test(bag)) return true;

    // A short numeric box (4 to 8 characters) is typically an OTP or PIN.
    const max = parseInt(el.getAttribute("maxlength"), 10);
    const mode = (el.getAttribute("inputmode") || "").toLowerCase();
    const numeric = mode === "numeric" || mode === "decimal" ||
      type === "number" || type === "tel";
    if (tag === "input" && numeric && max >= 4 && max <= 8 &&
        !POSTAL_HINT.test(bag)) return true;
    return false;
  }

  // Walks up (also out of shadow roots). Returns "ignored" for elements the
  // site owner or Saarthi itself excluded, otherwise the nearest landmark.
  function inspectAncestors(el) {
    let area = "";
    for (let node = el; node; node = composedParent(node)) {
      if (node.id === ROOT_ID) return { ignored: true, area: "" };
      if (node.hasAttribute("data-saarthi-ignore") ||
          node.getAttribute("aria-hidden") === "true" ||
          node.hasAttribute("inert")) return { ignored: true, area: "" };
      if (!area) {
        const tag = node.tagName.toLowerCase();
        const role = (node.getAttribute("role") || "").toLowerCase();
        let landmark = "";
        if (tag === "nav" || role === "navigation") landmark = "nav";
        else if (tag === "main" || role === "main") landmark = "main";
        else if (tag === "aside" || role === "complementary") landmark = "aside";
        else if (tag === "header" || role === "banner") landmark = "header";
        else if (tag === "footer" || role === "contentinfo") landmark = "footer";
        else if (tag === "form" || role === "form") landmark = "form";
        else if (tag === "dialog" || role === "dialog") landmark = "dialog";
        else if (role === "search") landmark = "search";
        if (landmark) {
          const name = normalizeSpaces(node.getAttribute("aria-label") || "");
          area = name ? landmark + ": " + truncate(name, 30) : landmark;
        }
      }
    }
    return { ignored: false, area: area };
  }

  function collectCandidates() {
    const out = [];
    function walk(root) {
      let found;
      try { found = root.querySelectorAll(CLICKABLE_SELECTOR); } catch (error) { return; }
      for (let i = 0; i < found.length && out.length < MAX_CANDIDATES; i++) {
        out.push(found[i]);
      }
      // Open shadow roots (web components) are read too.
      let all;
      try { all = root.querySelectorAll("*"); } catch (error) { return; }
      for (let i = 0; i < all.length && i < MAX_CANDIDATES * 3; i++) {
        const shadowRoot = all[i].shadowRoot;
        if (shadowRoot && all[i].id !== ROOT_ID) walk(shadowRoot);
      }
    }
    walk(document);
    return out;
  }

  function goalWords(goal) {
    return String(goal || "").toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u)
      .filter((word) => word.length >= 3 && GOAL_STOPWORDS.indexOf(word) === -1)
      .slice(0, 12);
  }

  // Returns the items (with the DOM element kept in `el` for later steps).
  function scanPage(options) {
    const opts = options || {};
    const requested = parseInt(opts.max, 10);
    const max = Math.max(1, Math.min(200, requested || MAX_ITEMS));
    const words = goalWords(opts.goal);
    const skipped = { hidden: 0, secret: 0, ignored: 0, unnamed: 0 };
    const viewW = window.innerWidth || document.documentElement.clientWidth;
    const viewH = window.innerHeight || document.documentElement.clientHeight;
    const entries = [];
    const candidates = collectCandidates();

    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      const where = inspectAncestors(el);
      if (where.ignored) { skipped.ignored++; continue; }
      if (!isVisible(el)) { skipped.hidden++; continue; }
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) { skipped.hidden++; continue; }
      if (window.getComputedStyle(el).pointerEvents === "none") { skipped.hidden++; continue; }

      const tag = el.tagName.toLowerCase();
      const type = tag === "input" ? inputTypeOf(el) : "";
      if (type === "hidden") { skipped.hidden++; continue; }

      const kind = kindOf(el);
      let label = accessibleLabel(el);
      if (!label) label = normalizeSpaces(el.getAttribute("title") || "");
      if (!label && (tag === "input" || tag === "textarea")) {
        label = normalizeSpaces(el.getAttribute("placeholder") || "");
      }

      if (isSecretField(el, kind, label)) { skipped.secret++; continue; }

      // Visible words of the item. Buttons made with <input> show their
      // label in the "value" ATTRIBUTE; a text field's typed value is
      // never touched.
      let text = "";
      if (tag === "input") {
        if (kind === "button") {
          text = normalizeSpaces(el.getAttribute("value") || el.getAttribute("alt") || "");
        }
      } else if (tag !== "select" && tag !== "textarea") {
        text = normalizeSpaces(ownText(el));
      }

      text = truncate(maskNumbers(text, "…"), 80);
      label = truncate(maskNumbers(label, "…"), 80);
      if (!text && !label) { skipped.unnamed++; continue; }

      const onScreen = rect.bottom > 0 && rect.right > 0 &&
        rect.top < viewH && rect.left < viewW;
      const disabled = el.disabled === true || el.getAttribute("aria-disabled") === "true";
      const isField = kind === "input" || kind === "select" || kind === "textarea" ||
        kind === "checkbox" || kind === "radio";

      let score = 0;
      if (onScreen) score += 100;
      if (/^(main|form|dialog)/.test(where.area)) score += 30;
      else if (/^nav/.test(where.area)) score += 10;
      else if (/^footer/.test(where.area)) score -= 20;
      if (isField) score += 10;
      if (disabled) score -= 30;
      const haystack = (text + " " + label).toLowerCase();
      let matches = 0;
      for (let w = 0; w < words.length && matches < 3; w++) {
        if (haystack.indexOf(words[w]) !== -1) matches++;
      }
      score += matches * 40;

      entries.push({
        order: entries.length, score: score, el: el,
        kind: kind, type: type || (tag === "a" ? "link" : tag),
        text: text, label: label, area: where.area,
        onScreen: onScreen, disabled: disabled
      });
    }

    const total = entries.length;
    const chosen = entries.slice().sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, max)
      .sort((a, b) => a.order - b.order);
    chosen.forEach((entry, index) => { entry.id = index + 1; });
    return { items: chosen, total: total, truncated: total > chosen.length, skipped: skipped };
  }

  function readPageData(options) {
    const scan = scanPage(options);
    return {
      screen: maskNumbers(getScreenName(), "…"),
      total: scan.total,
      shown: scan.items.length,
      truncated: scan.truncated,
      skipped: scan.skipped,
      items: scan.items.map((entry) => ({
        id: entry.id, kind: entry.kind, type: entry.type,
        text: entry.text, label: entry.label, area: entry.area,
        onScreen: entry.onScreen, disabled: entry.disabled
      }))
    };
  }

  /* ------------------------------------------------------------------ */
  /* History (stored in localStorage, NEVER any typed text)             */
  /* ------------------------------------------------------------------ */
  function loadHistory() {
    const raw = storageGet("localStorage", HISTORY_KEY);
    if (!raw) return [];
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data
        .filter((entry) =>
          entry && typeof entry === "object" &&
          (entry.type === "goal" || entry.type === "step") &&
          typeof entry.ts === "number")
        .slice(0, MAX_HISTORY);
    } catch (error) {
      return [];
    }
  }

  // Returns true if saved. Re-reads first so another tab's entries are kept.
  function addHistoryEntry(entry) {
    const items = loadHistory();
    items.unshift(entry);
    return storageSet(
      "localStorage",
      HISTORY_KEY,
      JSON.stringify(items.slice(0, MAX_HISTORY))
    );
  }

  /* ------------------------------------------------------------------ */
  /* The goal that follows the user between pages (sessionStorage)      */
  /* ------------------------------------------------------------------ */
  function loadTask() {
    const raw = storageGet("sessionStorage", TASK_KEY);
    if (!raw) return null;
    try {
      const task = JSON.parse(raw);
      const fresh = task && typeof task.goal === "string" &&
        typeof task.ts === "number" && Date.now() - task.ts <= TASK_TTL_MS;
      if (!fresh) {
        storageRemove("sessionStorage", TASK_KEY);
        return null;
      }
      return task;
    } catch (error) {
      storageRemove("sessionStorage", TASK_KEY);
      return null;
    }
  }
  function saveTask(goal) {
    storageSet("sessionStorage", TASK_KEY, JSON.stringify({
      goal: goal,
      ts: Date.now()
    }));
  }

  /* ------------------------------------------------------------------ */
  /* Speech helpers                                                     */
  /* ------------------------------------------------------------------ */
  function speechSupported() {
    return !!window.speechSynthesis &&
      typeof window.SpeechSynthesisUtterance === "function";
  }

  // Android Chrome reports some voices as "hi_IN" (underscore).
  function normLang(lang) {
    return String(lang || "").toLowerCase().replace(/_/g, "-");
  }

  // Long text is spoken in short pieces: Chrome can stop in the middle of
  // long utterances.
  function splitForSpeech(text) {
    const source = String(text || "").trim();
    if (!source) return [];
    const pieces = source.match(/[^.!?।\n]+[.!?।]*/g) || [source];
    const chunks = [];
    let current = "";

    function flush() {
      if (current) chunks.push(current);
      current = "";
    }

    pieces.forEach((rawPiece) => {
      const piece = normalizeSpaces(rawPiece);
      if (!piece) return;

      if (piece.length > SPEECH_CHUNK_MAX) {
        flush();
        let buffer = "";
        piece.split(" ").forEach((word) => {
          const next = buffer ? buffer + " " + word : word;
          if (next.length > SPEECH_CHUNK_MAX && buffer) {
            chunks.push(buffer);
            buffer = word;
          } else {
            buffer = next;
          }
        });
        if (buffer) chunks.push(buffer);
        return;
      }

      const joined = current ? current + " " + piece : piece;
      if (joined.length > SPEECH_CHUNK_MAX) {
        flush();
        current = piece;
      } else {
        current = joined;
      }
    });
    flush();
    return chunks;
  }

  function formatTime(ts, lang) {
    const date = new Date(ts);
    const locale = lang === "hi" ? "hi-IN" : "en-IN";
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
    } catch (error) {
      try { return date.toLocaleString(locale); }
      catch (error2) { return date.toISOString(); }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Styles and markup                                                  */
  /* ------------------------------------------------------------------ */
  const styles = `
    :host {
      all: initial;
      font-family: "Noto Sans Devanagari", "Nirmala UI", Mangal,
        system-ui, Arial, sans-serif;
      color: #172033;
      font-size: 18px;
      line-height: 1.5;
      -webkit-text-size-adjust: 100%;
    }

    *, *::before, *::after { box-sizing: border-box; }
    [hidden] { display: none !important; }

    button, input { font: inherit; }
    button { cursor: pointer; touch-action: manipulation; }

    button:focus-visible, input:focus-visible {
      outline: 4px solid #f59e0b;
      outline-offset: 3px;
    }
    .panel:focus { outline: none; }

    .launcher {
      pointer-events: auto;
      position: fixed;
      right: 20px;
      right: max(20px, env(safe-area-inset-right));
      bottom: 20px;
      bottom: max(20px, env(safe-area-inset-bottom));
      width: 84px;
      height: 84px;
      border: 4px solid white;
      border-radius: 50%;
      background: #173f8a;
      color: white;
      box-shadow: 0 4px 18px #0005;
      font-weight: 800;
      font-size: 15px;
      line-height: 1.15;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
      padding: 0;
      overflow: hidden;
    }
    .launcher-icon { font-size: 27px; line-height: 1.1; }

    .panel {
      pointer-events: auto;
      position: fixed;
      right: 12px;
      bottom: 116px;
      bottom: max(116px, calc(env(safe-area-inset-bottom) + 116px));
      width: calc(100vw - 24px);
      width: min(420px, calc(100vw - 24px));
      max-height: 78vh;
      max-height: min(78dvh, 720px);
      overflow: auto;
      overscroll-behavior: contain;
      background: #ffffff;
      color: #172033;
      border: 2px solid #d5ddeb;
      border-radius: 22px;
      box-shadow: 0 12px 40px #0004;
      padding: 0;
    }

    /* The header stays at the top while the panel scrolls, so the
       Close and language buttons are always reachable. */
    .header {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 20px 10px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
    }
    .view { padding: 0 20px 20px; }
    .header-buttons {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    h2 { margin: 0; font-size: 28px; line-height: 1.25; }
    .subtitle { margin: 4px 0 0; color: #475569; font-size: 17px; }

    .small-button {
      min-height: 48px;
      padding: 8px 12px;
      border: 2px solid #cbd5e1;
      border-radius: 12px;
      background: #fff;
      color: #172033;
      font-weight: 700;
    }

    .label {
      display: block;
      margin: 16px 0 8px;
      font-size: 20px;
      font-weight: 800;
    }

    input {
      display: block;
      width: 100%;
      min-height: 60px;
      border: 2px solid #64748b;
      border-radius: 12px;
      padding: 12px;
      background: #fff;
      color: #172033;
      font-size: 19px;
    }

    .privacy-note { margin: 8px 0 0; color: #475569; font-size: 15px; }

    .actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin-top: 14px;
    }

    .action {
      width: 100%;
      min-height: 58px;
      border: 0;
      border-radius: 13px;
      padding: 12px 14px;
      font-weight: 800;
      font-size: 19px;
      text-align: left;
      overflow-wrap: anywhere;
    }
    .primary { background: #173f8a; color: #fff; }
    .secondary {
      background: #eaf1ff;
      color: #17366c;
      border: 2px solid #b8cdf5;
    }
    .warning {
      background: #fff1e8;
      color: #853400;
      border: 2px solid #fed7aa;
    }

    .message {
      margin: 18px 0 0;
      padding: 14px;
      border-radius: 14px;
      background: #f1f5f9;
      border-left: 5px solid #173f8a;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 19px;
    }

    .status {
      min-height: 28px;
      margin-top: 10px;
      color: #334155;
      font-size: 16px;
    }

    .notice { margin: 0; color: #853400; font-size: 16px; font-weight: 700; }
    .notice:empty { display: none; }

    .confirm {
      margin: 14px 0;
      padding: 14px;
      border: 2px solid #fed7aa;
      border-radius: 14px;
      background: #fff7ed;
    }
    .confirm p { margin: 0; font-weight: 800; font-size: 19px; }

    .history-list { list-style: none; padding: 0; margin: 14px 0; }
    .history-list li {
      padding: 12px 0;
      border-bottom: 1px solid #dbe3ef;
      overflow-wrap: anywhere;
    }
    .history-num { font-weight: 800; margin-right: 6px; }
    .history-icon { margin-right: 6px; }
    .history-time {
      display: block;
      margin-top: 4px;
      color: #64748b;
      font-size: 15px;
    }

    @media (max-width: 480px) {
      .panel {
        right: 8px;
        bottom: 108px;
        bottom: max(108px, calc(env(safe-area-inset-bottom) + 108px));
        width: calc(100vw - 16px);
        max-height: 75vh;
        max-height: 75dvh;
      }
      .header { padding: 8px 16px; align-items: center; }
      .header-buttons { flex-wrap: nowrap; }
      .subtitle { display: none; }
      .small-button { padding: 6px 10px; font-size: 16px; }
      .view { padding: 0 16px 16px; }
      h2 { font-size: 25px; }
      .action { font-size: 18px; }
      .launcher { width: 76px; height: 76px; }
    }

    @media (forced-colors: active) {
      .launcher { border-color: ButtonText; }
      .panel { border-color: CanvasText; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        scroll-behavior: auto !important;
        animation: none !important;
        transition: none !important;
      }
    }
  `;

  const markup = `
    <style>${styles}</style>

    <button class="launcher" id="launcher" type="button"
      aria-controls="panel" aria-expanded="false">
      <span class="launcher-icon" aria-hidden="true">🧭</span>
      <span id="launcherText"></span>
    </button>

    <section class="panel" id="panel" role="dialog" aria-modal="false"
      tabindex="-1" hidden>
      <header class="header">
        <div>
          <h2 id="title"></h2>
          <p class="subtitle" id="subtitle"></p>
        </div>
        <div class="header-buttons">
          <button class="small-button" id="language" type="button"></button>
          <button class="small-button" id="close" type="button"></button>
        </div>
      </header>

      <div class="view" id="home">
        <label class="label" id="goalLabel" for="goal"></label>
        <input id="goal" type="text" autocomplete="off" autocapitalize="off"
          spellcheck="false" enterkeyhint="go" maxlength="500"
          aria-describedby="privacyNote" />
        <p class="privacy-note" id="privacyNote"></p>

        <div class="actions">
          <button class="action primary" id="submitGoal" type="button"></button>
          <button class="action secondary" id="listen" type="button"></button>
          <button class="action secondary" id="where" type="button"></button>
          <button class="action secondary" id="history" type="button"></button>
        </div>

        <p class="message" id="message" role="status" aria-live="polite"></p>
        <p class="status" id="status" aria-live="polite"></p>
        <p class="notice" id="notice" aria-live="polite"></p>
      </div>

      <div class="view" id="historyView" hidden>
        <h2 id="historyTitle"></h2>
        <ul class="history-list" id="historyList" role="list"></ul>

        <div class="confirm" id="confirmBox" role="alertdialog"
          aria-labelledby="confirmText" hidden>
          <p id="confirmText"></p>
          <div class="actions">
            <button class="action warning" id="confirmYes" type="button"></button>
            <button class="action secondary" id="confirmNo" type="button"></button>
          </div>
        </div>

        <div class="actions" id="historyActions">
          <button class="action warning" id="clearAll" type="button"></button>
          <button class="action secondary" id="back" type="button"></button>
        </div>
        <p class="status" id="historyStatus" aria-live="polite"></p>
      </div>
    </section>
  `;

  /* ------------------------------------------------------------------ */
  /* The widget itself                                                  */
  /* ------------------------------------------------------------------ */
  let instance = null;

  function create() {
    if (instance) return instance;
    if (document.getElementById(ROOT_ID)) return null;

    let language = readLanguage();
    let currentView = "home";
    let currentMessage = null;      // function (t) -> text, so it can be re-translated
    let historyItems = [];
    let availableVoices = [];
    let activeUtterance = null;     // keep a reference so it is not garbage-collected
    let speechStartTimer = null;
    let speechToken = 0;
    let weAreSpeaking = false;
    let voiceWarning = false;
    const cleanups = [];

    const root = document.createElement("div");
    root.id = ROOT_ID;
    // Keep the widget above website content, but let clicks pass through
    // everywhere except on Saarthi's own button and panel.
    // "!important" inline styles beat the website's own !important rules,
    // so site CSS such as "div { display:none !important }" cannot hide it.
    [
      ["position", "fixed"], ["top", "0"], ["right", "0"], ["bottom", "0"],
      ["left", "0"], ["width", "auto"], ["height", "auto"],
      ["z-index", "2147483647"], ["pointer-events", "none"],
      ["display", "block"], ["visibility", "visible"], ["opacity", "1"],
      ["transform", "none"], ["margin", "0"], ["padding", "0"],
      ["border", "0"], ["overflow", "visible"]
    ].forEach((rule) => root.style.setProperty(rule[0], rule[1], "important"));
    document.documentElement.appendChild(root);

    // Website CSS cannot select elements inside this Shadow DOM.
    const shadow = root.attachShadow({ mode: "open" });
    shadow.innerHTML = markup;

    const $ = (id) => shadow.getElementById(id);
    const T = () => translations[language];

    function setStatus(message) {
      const target = currentView === "history" ? $("historyStatus") : $("status");
      target.textContent = message || "";
    }

    /* ----- speech ---------------------------------------------------- */
    function refreshVoices() {
      if (!speechSupported()) return;
      try {
        availableVoices = window.speechSynthesis.getVoices() || [];
      } catch (error) {
        availableVoices = [];
      }
    }

    if (speechSupported()) {
      refreshVoices();
      const synthesis = window.speechSynthesis;
      // addEventListener only: setting onvoiceschanged would replace a
      // handler the website may have set.
      if (typeof synthesis.addEventListener === "function") {
        synthesis.addEventListener("voiceschanged", refreshVoices);
        cleanups.push(() => {
          try { synthesis.removeEventListener("voiceschanged", refreshVoices); }
          catch (error) { /* ignore */ }
        });
      }
    }

    function chooseVoice(lang) {
      refreshVoices();
      const wanted = normLang(lang);
      const base = wanted.split("-")[0];
      const find = (test) => {
        for (let i = 0; i < availableVoices.length; i++) {
          if (test(normLang(availableVoices[i].lang))) return availableVoices[i];
        }
        return null;
      };
      return (
        find((v) => v === wanted) ||
        find((v) => v.indexOf(base + "-") === 0) ||
        find((v) => v === base) ||
        null
      );
    }

    function cancelSpeech() {
      speechToken++;
      if (speechStartTimer !== null) {
        window.clearTimeout(speechStartTimer);
        speechStartTimer = null;
      }
      activeUtterance = null;
      // Only cancel speech that Saarthi started, not the website's own.
      if (weAreSpeaking && speechSupported()) {
        try { window.speechSynthesis.cancel(); } catch (error) { /* ignore */ }
      }
      weAreSpeaking = false;
    }

    function speakText(text) {
      if (!text) return;

      if (!speechSupported()) {
        setStatus(T().speechUnavailable);
        return;
      }

      const chunks = splitForSpeech(text);
      if (chunks.length === 0) return;

      cancelSpeech();
      const token = speechToken;
      const targetLang = language === "hi" ? "hi-IN" : "en-IN";
      const synthesis = window.speechSynthesis;
      let index = 0;
      voiceWarning = false;
      setStatus(T().audioStarting);

      const speakNext = () => {
        if (token !== speechToken) return;

        if (index >= chunks.length) {
          activeUtterance = null;
          weAreSpeaking = false;
          if (!voiceWarning) setStatus(T().audioDone);
          return;
        }

        const utterance = new window.SpeechSynthesisUtterance(chunks[index]);
        utterance.lang = targetLang;
        utterance.rate = 0.88;
        utterance.pitch = 1;

        const voice = chooseVoice(targetLang);
        if (voice) {
          utterance.voice = voice;
        } else if (index === 0 && availableVoices.length > 0) {
          // Voices are loaded but none matches this language.
          voiceWarning = true;
          setStatus(T().noVoice);
        }

        utterance.onstart = () => {
          if (token !== speechToken) return;
          if (!voiceWarning) setStatus(T().audioPlaying);
        };
        utterance.onend = () => {
          if (token !== speechToken) return;
          index++;
          speakNext();
        };
        utterance.onerror = (event) => {
          if (token !== speechToken) return;
          const reason = event && event.error;
          // Our own cancel() calls are filtered out by the token check above,
          // so "interrupted"/"canceled" here means something else (for
          // example the website) stopped the speech. Stop quietly.
          if (reason === "interrupted" || reason === "canceled") {
            speechToken++;
            activeUtterance = null;
            weAreSpeaking = false;
            setStatus("");
            return;
          }
          speechToken++;
          activeUtterance = null;
          weAreSpeaking = false;
          console.warn("[Saarthi] Speech synthesis error:", reason || event);
          setStatus(T().speechError);
        };

        activeUtterance = utterance;
        weAreSpeaking = true;
        synthesis.speak(utterance);
      };

      // Chrome can stay silent if speak() follows cancel() immediately.
      speechStartTimer = window.setTimeout(() => {
        speechStartTimer = null;
        if (token !== speechToken) return;
        try {
          speakNext();
        } catch (error) {
          console.warn("[Saarthi] Speech error:", error);
          activeUtterance = null;
          weAreSpeaking = false;
          setStatus(T().speechError);
        }
      }, 120);
    }

    const onPageHide = () => cancelSpeech();
    window.addEventListener("pagehide", onPageHide);
    cleanups.push(() => window.removeEventListener("pagehide", onPageHide));

    /* ----- messages -------------------------------------------------- */
    function renderMessage() {
      $("message").textContent = currentMessage ? currentMessage(T()) : "";
    }

    // `source` is a plain string or a function (t) -> string, so the message
    // can be shown again in the other language.
    function showMessage(source, shouldSpeak) {
      currentMessage = typeof source === "function"
        ? source
        : () => String(source);
      renderMessage();
      revealMessage();
      if (shouldSpeak) speakText($("message").textContent);
    }

    // On short screens the answer can sit below the visible part of the
    // panel. Scroll the panel (not the website) so the answer is in view.
    function revealMessage() {
      const panel = $("panel");
      if (panel.hidden || currentView !== "home") return;
      const message = $("message");
      const bottom = message.offsetTop + message.offsetHeight + 16;
      if (bottom > panel.scrollTop + panel.clientHeight) {
        panel.scrollTop = bottom - panel.clientHeight;
      }
    }

    function showWelcome() {
      showMessage((t) => t.welcome, false);
    }

    /* ----- language -------------------------------------------------- */
    function renderLanguage() {
      const t = T();
      const lang = language === "hi" ? "hi" : "en";

      root.setAttribute("lang", lang);
      $("panel").setAttribute("lang", lang);

      shadow.querySelectorAll("[data-i18n]").forEach((el) => {
        el.textContent = t[el.getAttribute("data-i18n")];
      });
      $("close").textContent = "✕ " + t.close;
      $("goal").placeholder = t.goalPlaceholder;
      $("launcher").setAttribute("aria-label", t.launcherLabel);
      $("panel").setAttribute("aria-label", t.panelLabel);
      $("close").setAttribute("aria-label", t.close);

      renderMessage();
      if (currentView === "history") renderHistory();
    }

    // Map element id -> translation key
    const i18nMap = {
      launcherText: "title",
      title: "title",
      subtitle: "subtitle",
      goalLabel: "goalLabel",
      privacyNote: "privacyNote",
      submitGoal: "startTask",
      listen: "listen",
      where: "where",
      history: "history",
      language: "language",
      historyTitle: "historyTitle",
      clearAll: "clearAll",
      back: "back",
      confirmText: "confirmClear",
      confirmYes: "confirmYes",
      confirmNo: "confirmNo"
    };
    Object.keys(i18nMap).forEach((id) => {
      $(id).setAttribute("data-i18n", i18nMap[id]);
    });

    /* ----- history view ---------------------------------------------- */
    function entryTitle(entry) {
      if (entry.type === "goal") return T().historyGoal;
      const title = entry.title;
      if (title && typeof title === "object") {
        return String(title[language] || title.hi || title.en || "");
      }
      return String(title || "");
    }

    function renderHistory() {
      const list = $("historyList");
      while (list.firstChild) list.removeChild(list.firstChild);

      if (historyItems.length === 0) {
        const item = document.createElement("li");
        item.textContent = T().historyEmpty;
        list.appendChild(item);
        return;
      }

      historyItems.forEach((entry, index) => {
        const item = document.createElement("li");
        const line = document.createElement("div");
        const number = document.createElement("span");
        const icon = document.createElement("span");
        const title = document.createElement("span");
        const time = document.createElement("span");

        number.className = "history-num";
        number.textContent = (historyItems.length - index) + ".";
        icon.className = "history-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = String(entry.icon || "✅");
        title.textContent = entryTitle(entry);
        time.className = "history-time";
        time.textContent = formatTime(entry.ts, language);

        // textContent only: stored history is never read as HTML.
        line.append(number, icon, title);
        item.append(line, time);
        list.appendChild(item);
      });
    }

    function showHome() {
      currentView = "home";
      $("home").hidden = false;
      $("historyView").hidden = true;
      $("confirmBox").hidden = true;
      $("historyActions").hidden = false;
      setStatus("");
    }

    function openHistory() {
      currentView = "history";
      $("home").hidden = true;
      $("historyView").hidden = false;
      $("confirmBox").hidden = true;
      $("historyActions").hidden = false;
      $("historyStatus").textContent = "";
      historyItems = loadHistory();
      renderHistory();
      $("back").focus();
    }

    function askToClear() {
      $("confirmBox").hidden = false;
      $("historyActions").hidden = true;
      speakText(T().confirmClear);
      $("confirmNo").focus();
    }

    function cancelClear() {
      $("confirmBox").hidden = true;
      $("historyActions").hidden = false;
      cancelSpeech();
      $("clearAll").focus();
    }

    function clearEverything() {
      cancelSpeech();
      wipeStoredData();
      historyItems = [];
      $("goal").value = "";
      showWelcome();
      $("confirmBox").hidden = true;
      $("historyActions").hidden = false;
      renderHistory();
      $("historyStatus").textContent = T().allCleared;
      $("back").focus();
    }

    /* ----- panel ----------------------------------------------------- */
    function prefersKeyboardFocus() {
      if (typeof window.matchMedia !== "function") return true;
      return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    }

    function openPanel() {
      $("panel").hidden = false;
      $("launcher").setAttribute("aria-expanded", "true");
      showHome();

      const task = loadTask();
      if (task && !$("goal").value) $("goal").value = task.goal;

      // On phones, focusing the box would pop up the keyboard over the panel.
      if (prefersKeyboardFocus()) {
        $("goal").focus();
      } else {
        $("panel").focus();
      }
    }

    function closePanel() {
      $("panel").hidden = true;
      $("confirmBox").hidden = true;
      $("launcher").setAttribute("aria-expanded", "false");
      cancelSpeech();
      $("launcher").focus();
    }

    /* ----- actions --------------------------------------------------- */
    function handleGoal() {
      const t = T();
      const goal = normalizeSpaces($("goal").value);

      if (!goal) {
        showMessage((x) => x.emptyGoal, true);
        $("goal").focus();
        return;
      }

      if (looksSensitive(goal)) {
        // Do not keep it anywhere: clear the box and forget any saved goal.
        $("goal").value = "";
        storageRemove("sessionStorage", TASK_KEY);
        showMessage((x) => x.sensitiveGoal, true);
        $("goal").focus();
        return;
      }

      saveTask(goal);

      // The history records THAT a goal was set, never what it said.
      const saved = addHistoryEntry({ type: "goal", icon: "🎯", ts: Date.now() });
      $("notice").textContent = saved ? "" : t.storageFailed;

      showMessage((x) => x.goalReceived(goal), true);
    }

    function handleWhere() {
      const rawName = getScreenName();
      showMessage((t) => {
        const name = rawName
          ? maskNumbers(rawName, t.numberHidden)
          : t.untitled;
        return t.currentPage(name);
      }, true);
    }

    function handleListen() {
      const text = $("message").textContent || T().welcome;
      speakText(text);
    }

    function toggleLanguage() {
      cancelSpeech();
      language = language === "hi" ? "en" : "hi";
      storageSet("localStorage", LANG_KEY, language);
      setStatus("");
      $("notice").textContent = "";
      renderLanguage();
    }

    /* ----- events ---------------------------------------------------- */
    $("launcher").addEventListener("click", () => {
      if ($("panel").hidden) openPanel(); else closePanel();
    });
    $("close").addEventListener("click", closePanel);
    $("language").addEventListener("click", toggleLanguage);
    $("submitGoal").addEventListener("click", handleGoal);
    $("listen").addEventListener("click", handleListen);
    $("where").addEventListener("click", handleWhere);
    $("history").addEventListener("click", openHistory);
    $("clearAll").addEventListener("click", askToClear);
    $("confirmYes").addEventListener("click", clearEverything);
    $("confirmNo").addEventListener("click", cancelClear);
    $("back").addEventListener("click", () => {
      showHome();
      if (prefersKeyboardFocus()) $("goal").focus(); else $("panel").focus();
    });

    $("goal").addEventListener("keydown", (event) => {
      // Do not submit while a Hindi keyboard is still composing a word.
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === "Enter") handleGoal();
    });

    shadow.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || $("panel").hidden) return;
      if (!$("confirmBox").hidden) {
        cancelClear();
      } else {
        closePanel();
      }
    });

    // Keep Saarthi's clicks and typing away from the website's own
    // handlers (for example "click anywhere to close the menu" scripts, or
    // keyboard shortcuts), and keep what is typed in the goal box from
    // reaching scripts that listen on the whole document.
    [
      "click", "dblclick", "mousedown", "mouseup", "pointerdown", "pointerup",
      "touchstart", "touchend", "keydown", "keyup", "keypress",
      "input", "change", "paste", "cut", "copy"
    ].forEach((type) => {
      shadow.addEventListener(type, (event) => event.stopPropagation());
    });

    /* ----- start ----------------------------------------------------- */
    showWelcome();
    renderLanguage();

    instance = {
      open: openPanel,
      close: closePanel,
      isOpen: () => !$("panel").hidden,
      refreshHistory: () => {
        if (currentView === "history") {
          historyItems = loadHistory();
          renderHistory();
        }
      },
      resetAfterWipe: () => {
        historyItems = [];
        $("goal").value = "";
        showWelcome();
        if (currentView === "history") renderHistory();
      },
      destroy: () => {
        cancelSpeech();
        cleanups.forEach((fn) => fn());
        if (root.parentNode) root.parentNode.removeChild(root);
        instance = null;
      }
    };
    return instance;
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                         */
  /* ------------------------------------------------------------------ */
  function cleanTitle(value) {
    return truncate(normalizeSpaces(value), 80);
  }

  const api = {
    version: VERSION,

    isEnabled: () => instance !== null,

    setEnabled: (on) => {
      writeEnabled(!!on);
      if (on) {
        create();
      } else if (instance) {
        instance.destroy();
      }
      return instance !== null;
    },

    open: () => { if (instance) instance.open(); },
    close: () => { if (instance) instance.close(); },

    // Add a finished step to "What have I done?".
    // Text that looks like an OTP / PIN / password / long number is refused.
    logStep: (title, icon) => {
      if (!instance) return false;
      let stored;
      if (typeof title === "string") {
        stored = cleanTitle(title);
        if (!stored || looksSensitive(stored)) return false;
      } else if (title && typeof title === "object") {
        stored = {};
        ["hi", "en"].forEach((lang) => {
          if (typeof title[lang] === "string") stored[lang] = cleanTitle(title[lang]);
        });
        const texts = Object.keys(stored).map((k) => stored[k]);
        if (texts.length === 0 || texts.some((x) => !x || looksSensitive(x))) {
          return false;
        }
      } else {
        return false;
      }
      const entry = {
        type: "step",
        icon: typeof icon === "string" && icon ? Array.from(icon).slice(0, 2).join("") : "✅",
        title: stored,
        ts: Date.now()
      };
      const saved = addHistoryEntry(entry);
      instance.refreshHistory();
      return saved;
    },

    clearAll: () => {
      wipeStoredData();
      if (instance) instance.resetAfterWipe();
    },

    // STEP 8. What can be pressed on this page right now (labels only).
    // Returns null while Saarthi is switched OFF.
    readPage: (options) => (instance ? readPageData(options) : null),

    // Same list, printed as a table in the browser console (press F12).
    debugPage: (options) => {
      if (!instance) { console.info("[Saarthi] OFF: nothing to read."); return null; }
      const data = readPageData(options);
      console.info(
        "[Saarthi] Screen: " + data.screen + " | shown " + data.shown +
        " of " + data.total + " | skipped " + JSON.stringify(data.skipped)
      );
      if (typeof console.table === "function") {
        console.table(data.items.map((item) => ({
          id: item.id, kind: item.kind, type: item.type, text: item.text,
          label: item.label, area: item.area, onScreen: item.onScreen
        })));
      }
      return { screen: data.screen, total: data.total, shown: data.shown,
               truncated: data.truncated, skipped: data.skipped };
    },

    // Same list as JSON text, ready to paste into Google AI Studio (Step 13).
    pageJSON: (options) => (instance ? JSON.stringify(readPageData(options), null, 2) : "null")
  };

  try {
    Object.defineProperty(window, "Saarthi", {
      value: Object.freeze(api),
      writable: false,
      configurable: false
    });
  } catch (error) {
    return;
  }

  // Start-up: delete v0.1 data (it contained typed goals), then show the
  // widget unless the ON/OFF switch says OFF.
  wipeLegacyData();
  if (readEnabled()) {
    create();
    console.info("[Saarthi] Ready. Open the floating Saarthi button.");
  } else {
    console.info("[Saarthi] OFF. Saarthi.setEnabled(true) turns it on.");
  }
})();
