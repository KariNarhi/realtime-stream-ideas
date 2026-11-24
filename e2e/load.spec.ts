import { test, expect, openApp } from "./fixtures.ts";

test.describe("page load", () => {
  test("loads with the form, an empty list and both buttons, without browser errors", async ({ page }) => {
    await openApp(page); // the fixture fails the test on console/page/request errors
    await expect(page).toHaveTitle(/Game suggestions/);
    await expect(page.getByRole("heading", { name: "Suggest a game" })).toBeVisible();
    await expect(page.locator("#form")).toBeVisible();
    await expect(page.locator("#ideas .card")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Suggest Idea" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear" })).toBeVisible();
  });

  test("loads the Feathers client and Socket.io client globals", async ({ page }) => {
    await openApp(page);
    const globals = await page.evaluate(() => {
      // CDN globals are untyped here (they only exist inside the page)
      const w = window as unknown as Record<string, any>;
      return {
        feathers: typeof w.feathers === "function" && typeof w.feathers.socketio === "function",
        socketio: typeof w.io === "function" && typeof w.io.Manager === "function"
      };
    });
    expect(globals).toEqual({ feathers: true, socketio: true });
  });

  test("applies the custom theme stylesheet", async ({ page }) => {
    await openApp(page);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
    expect(bg).toContain("linear-gradient");
    const nav = await page.evaluate(() => getComputedStyle(document.querySelector(".app-nav")!).backgroundColor);
    expect(nav).toBe("rgb(59, 20, 107)"); // deep violet
  });
});
