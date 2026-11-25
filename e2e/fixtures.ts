import path from "node:path";
import { test as base, expect, type Page } from "@playwright/test";

const nm = (...p: string[]) => path.join(import.meta.dirname, "..", "node_modules", ...p);

/** CDN URL pattern -> local file and content type, so the tests need no network access. */
const CDN: [RegExp, string, string][] = [
  [/unpkg\.com\/@feathersjs\/client@5\.0\.51\/dist\/feathers\.js/, nm("@feathersjs/client/dist/feathers.js"), "text/javascript"],
  [/cdn\.socket\.io\/4\.8\.1\/socket\.io\.min\.js/, nm("socket.io-client/dist/socket.io.min.js"), "text/javascript"],
  [/stackpath\.bootstrapcdn\.com\/bootstrap\/4\.3\.1\/css\/bootstrap\.min\.css/, nm("bootstrap/dist/css/bootstrap.min.css"), "text/css"]
];
const FONTS = /fonts\.(googleapis|gstatic)\.com/;

/** Route CDNs to local files and collect anything that looks like a runtime error. */
async function preparePage(page: Page) {
  const errors: string[] = [];
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

/**
 * Opens the app and waits until the initial load finished and realtime listeners are on.
 * @param page The viewer's page.
 */
export async function openApp(page: Page) {
  await page.goto("/");
  await page.waitForSelector('body[data-ready="true"]');
}

/**
 * Fills and submits the form like a viewer would; the card shows up via the server's "created" event.
 * @param page The viewer's page.
 * @param idea Field values; defaults are used for omitted ones.
 */
export async function addIdea(
  page: Page,
  { text = "Game", tech = "mods", viewer = "Ann" }: { text?: string; tech?: string; viewer?: string } = {}
) {
  await page.fill("#idea-text", text);
  await page.fill("#idea-tech", tech);
  await page.fill("#idea-viewer", viewer);
  await page.click('#form button[type="submit"]');
}

export const test = base.extend<{ errors: string[]; openTab: () => Promise<Page> }>({
  /**
   * Auto fixture (runs for every test, no need to request it). The server keeps ideas in memory
   * and is shared by all tests, so clear it first via REST.
   */
  errors: [
    async ({ request }, use) => {
      await request.delete("/ideas");
      await use([]);
    },
    { auto: true }
  ],

  /** Wraps the built-in page: CDNs are served locally and any console/page/request error fails the test. */
  page: async ({ page }, use) => {
    const errors = await preparePage(page);
    await use(page);
    expect(errors, "unexpected browser errors").toEqual([]);
  },

  /**
   * Opens extra independent browser sessions ("tabs" of other viewers). Each context has its own
   * socket connection, so it is a separate viewer for realtime tests.
   */
  openTab: async ({ browser, baseURL }, use) => {
    const contexts: import("@playwright/test").BrowserContext[] = [];
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

export { expect };
