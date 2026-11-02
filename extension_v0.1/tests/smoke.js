// node tests/smoke.js  -> loads the extension in real Chromium and checks the service worker starts
const path = require("path");
const os = require("os");
const fs = require("fs");
const { chromium } = require("playwright");

(async () => {
  const ext = path.resolve(__dirname, "../extension");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "saarthi-"));
  const ctx = await chromium.launchPersistentContext(dir, {
    channel: "chromium",
    headless: true,
    args: ["--disable-extensions-except=" + ext, "--load-extension=" + ext, "--no-sandbox"]
  });
  let sw = ctx.serviceWorkers()[0];
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 10000 });
  console.log("service worker url:", sw.url());
  const info = await sw.evaluate(() => ({
    id: chrome.runtime.id,
    name: chrome.runtime.getManifest().name,
    version: chrome.runtime.getManifest().version,
    hasToggle: typeof toggleTab
  }));
  console.log(JSON.stringify(info));
  await ctx.close();
})().catch((e) => { console.error("SMOKE FAILED:", e.message); process.exit(1); });
