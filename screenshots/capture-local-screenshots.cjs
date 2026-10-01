const { mkdir } = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.SCREENSHOT_BASE_URL || "http://127.0.0.1:5173";

const routes = [
  ["00-feature-media.png", `${baseUrl}/app`],
  ["01-overview-setup.png", `${baseUrl}/app?screen=setup`],
  ["02-identifier-health.png", `${baseUrl}/app/health`],
  ["03-test-search.png", `${baseUrl}/app/diagnostic?q=BK204`],
  ["04-recovery-analytics-1-year.png", `${baseUrl}/app/analytics?days=365`],
];

(async () => {
  const outDir = path.join(__dirname, "app-store-worksbien-real");
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    headless: true,
    env: {
      ...process.env,
      HOME: "/tmp",
      XDG_CONFIG_HOME: "/tmp/chrome-config",
      XDG_CACHE_HOME: "/tmp/chrome-cache",
    },
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-crash-reporter", "--disable-crashpad"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    for (const [name, url] of routes) {
      await page.goto(url, { waitUntil: "networkidle" });
      await page.screenshot({ path: path.join(outDir, name), fullPage: false });
    }
  } finally {
    await browser.close();
  }
})();
