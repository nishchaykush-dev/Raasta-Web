# Saarthi proxy (Cloudflare Worker)

Files: worker.js, prompt.js, wrangler.toml, package.json.

## Deploy (once)
1. cd proxy && npm install
2. npx wrangler login
3. npx wrangler secret put GEMINI_API_KEY      (paste your key when asked; it is stored by Cloudflare, not in any file)
4. npx wrangler deploy                          (prints https://saarthi-proxy.<you>.workers.dev)
5. In extension/background.js set PROXY_URL = "https://saarthi-proxy.<you>.workers.dev/api/next-step"
6. Check: open https://saarthi-proxy.<you>.workers.dev/health  -> {"ok":true,...,"configured":true}
7. Later, once the extension has a fixed ID, put it in wrangler.toml ALLOWED_ORIGINS = "chrome-extension://<id>" and deploy again.

## Test on your own computer first
- copy .dev.vars.example to .dev.vars and put your key there (never share/upload this file)
- npx wrangler dev   -> http://localhost:8787/api/next-step
- In the browser console of the extension's service worker:
  chrome.storage.local.set({"saarthi-dev-proxy":"http://localhost:8787/api/next-step"})

## Teach Saarthi one website
Edit SITE_NOTES in prompt.js, then `npx wrangler deploy`.

## Tests (no key needed, Gemini is faked)
node --test ../tests/proxy.test.js ../tests/live-http.test.js
