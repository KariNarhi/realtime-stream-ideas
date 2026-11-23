const path = require("node:path");
const { test: base, expect } = require("@playwright/test");

const nm = (...p) => path.join(__dirname, "..", "node_modules", ...p);

// CDN URL -> local file, so the tests need no network access
const CDN = [
  [/unpkg\.com\/@feathersjs\/client@5\.0\.51\/dist\/feathers\.js/, nm("@feathersjs/client/dist/feathers.js"), "text/javascript"],
  [/cdn\.socket\.io\/4\.8\.1\/socket\.io\.min\.js/, nm("socket.io-client/dist/socket.io.min.js"), "text/javascript"],
  [/stackpath\.bootstrapcdn\.com\/bootstrap\/4\.3\.1\/css\/bootstrap\.min\.css/, nm("bootstrap/dist/css/bootstrap.min.css"), "text/css"]
];
const FONTS = /fonts\.(googleapis|gstatic)\.com/;

/** Route CDNs to local files and collect anything that looks like a runtime error. */
async function preparePage(page) {
  const errors = [];
  for (const [pattern, file, contentType] of CDN) {
    await page.route(pattern, route => route.fulfill({ path: file, contentType }));
  }
  await page.route(FONTS, route => route.abort());

  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => {
    // Aborted font requests (hermetic mode) log a generic network error in Chromium
    if (m.type() === "error" && !FONTS.test(m.location().url || "")) errors.push(`console: ${m.text()}`);
  });
  page.on("requestfailed", r => {
    if (!FONTS.test(r.url())) errors.push(`requestfailed: ${r.url()}`);
  });
  return errors;
}

/** Open the app and wait until the initial load finished and realtime listeners are on. */
async function openApp(page) {
  await page.goto("/");
  await page.waitForSelector('body[data-ready="true"]');
}

async function addIdea(page, { text = "Game", tech = "mods", viewer = "Ann" } = {}) {
  await page.fill("#idea-text", text);
  await page.fill("#idea-tech", tech);
  await page.fill("#idea-viewer", viewer);
  await page.click('#form button[type="submit"]');
}

const test = base.extend({
  // Shared in-memory server state: start every test from an empty list
  errors: [
    async ({ request }, use) => {
      await request.delete("/ideas");
      await use([]);
    },
    { auto: true }
  ],

  page: async ({ page }, use) => {
    const errors = await preparePage(page);
    await use(page);
    expect(errors, "unexpected browser errors").toEqual([]);
  },

  // Opens extra independent browser sessions ("tabs" of other viewers)
  openTab: async ({ browser, baseURL }, use) => {
    const contexts = [];
    await use(async () => {
      const context = await browser.newContext({ baseURL });
      contexts.push(context);
      const page = await context.newPage();
      await preparePage(page);
      return page;
    });
    await Promise.all(contexts.map(c => c.close()));
  }
});

module.exports = { test, expect, openApp, addIdea };
