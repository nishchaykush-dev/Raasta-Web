SAARTHI v0.7 - extension + AI next-step
========================================

FOLDERS
  extension/   <- load THIS folder in the browser (manifest.json, background.js, raasta.js, icons/)
  raasta.js    <- the source file (same as extension/raasta.js). After you edit it, copy it into extension/ again.
  index.html   <- launcher (now has an "Use Saarthi on any website" section)
  portal.html  <- demo portal (unchanged)
  tests/       <- optional automatic tests (need:  npm i playwright)

LOAD THE EXTENSION (Chrome / Edge)
  1. Open chrome://extensions   (Edge: edge://extensions)
  2. Turn on "Developer mode"
  3. "Load unpacked" -> choose the  extension  folder
  4. Open any website, click the Saarthi icon in the toolbar. The badge shows ON for that tab.

THE AI PART NEEDS YOUR PROXY (next step)
  Open extension/background.js and set  PROXY_URL  at the top.
  Until then Saarthi says "The AI service is not switched on yet".
  The AI key goes into the proxy, NEVER into the extension.
  Proxy contract:
    POST  { v:1, goal, lang:"hi"|"en", page:{host,title,screen,total}, items:[{id,kind,type,text,label,area,onScreen,disabled}], done:[...] }
    reply { step:{ itemId|null, action:"click|type|select|manual|scroll|wait|done", text_en, text_hi, why_en?, why_hi?, risk:"low|medium|high", isPayment:bool } }

RUN THE TESTS (optional)
  node --test tests/unit-background.test.js
  node tests/e2e.js
  node tests/e2e2.js
