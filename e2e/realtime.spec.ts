import type { Page } from "@playwright/test";
import { test, expect, openApp, addIdea } from "./fixtures.ts";

// A second viewer = a separate browser context with its own socket connection.
// In these tests `page` acts and `other` only observes, so any change it sees was pushed by the server.
async function openSecondViewer(openTab: () => Promise<Page>) {
  const other = await openTab();
  await openApp(other);
  return other;
}

test.describe("realtime sync between viewers", () => {
  test("an idea added in one tab appears in another without reload", async ({ page, openTab }) => {
    await openApp(page);
    const other = await openSecondViewer(openTab);

    await addIdea(page, { text: "Live idea", viewer: "Ann" });
    await expect(other.locator("#ideas .card")).toHaveCount(1);
    await expect(other.locator("#ideas .card")).toContainText("Live idea");
    await expect(other.locator("#ideas .card")).toContainText("Submitted by Ann");
  });

  test("deleting in one tab removes the card in the other", async ({ page, openTab }) => {
    await openApp(page);
    await addIdea(page, { text: "Keep" });
    await addIdea(page, { text: "Remove" });
    const other = await openSecondViewer(openTab);
    await expect(other.locator("#ideas .card")).toHaveCount(2);

    await page.locator("#ideas .card", { hasText: "Remove" }).locator(".delete-idea").click();

    await expect(other.locator("#ideas .card")).toHaveCount(1);
    await expect(other.locator("#ideas .card")).toContainText("Keep");
  });

  test("Clear in one tab empties the other", async ({ page, openTab }) => {
    await openApp(page);
    await addIdea(page, { text: "One" });
    await addIdea(page, { text: "Two" });
    const other = await openSecondViewer(openTab);
    await expect(other.locator("#ideas .card")).toHaveCount(2);

    await page.getByRole("button", { name: "Clear" }).click();

    await expect(other.locator("#ideas .card")).toHaveCount(0);
  });

  test("a viewer who joins later sees the existing ideas", async ({ page, openTab }) => {
    await openApp(page);
    await addIdea(page, { text: "Early" });
    await expect(page.locator("#ideas .card")).toHaveCount(1);

    const late = await openSecondViewer(openTab);
    await expect(late.locator("#ideas .card")).toHaveCount(1);
    await expect(late.locator("#ideas .card")).toContainText("Early");
  });

  // REST bypasses the browser entirely; the card can only appear if the server publishes the event
  test("ideas created through the REST API show up live", async ({ page, request }) => {
    await openApp(page);
    const res = await request.post("/ideas", { data: { text: "From REST", tech: "curl", viewer: "Bot" } });
    expect(res.status()).toBe(201);
    await expect(page.locator("#ideas .card")).toContainText("From REST");
  });

  test("deletes made through the REST API disappear live", async ({ page, request }) => {
    await openApp(page);
    await addIdea(page, { text: "Doomed" });
    await expect(page.locator("#ideas .card")).toHaveCount(1);
    const [idea] = await (await request.get("/ideas")).json();
    await request.delete(`/ideas/${idea.id}`);
    await expect(page.locator("#ideas .card")).toHaveCount(0);
  });
});
