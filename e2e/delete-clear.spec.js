const { test, expect, openApp, addIdea } = require("./fixtures");

test.describe("delete and clear", () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test("× removes only its own card", async ({ page }) => {
    for (const text of ["One", "Two", "Three"]) await addIdea(page, { text });
    await expect(page.locator("#ideas .card")).toHaveCount(3);

    await page.locator("#ideas .card", { hasText: "Two" }).locator(".delete-idea").click();

    const cards = page.locator("#ideas .card");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText("One");
    await expect(cards.nth(1)).toContainText("Three");
  });

  test("deleting works for ids created after earlier deletes (ids stay unique)", async ({ page }) => {
    await addIdea(page, { text: "Alpha" });
    await addIdea(page, { text: "Bravo" });
    await page.locator("#ideas .card", { hasText: "Alpha" }).locator(".delete-idea").click();
    await addIdea(page, { text: "Charlie" });
    await expect(page.locator("#ideas .card")).toHaveCount(2);

    await page.locator("#ideas .card", { hasText: "Charlie" }).locator(".delete-idea").click();
    const cards = page.locator("#ideas .card");
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText("Bravo");
  });

  test("Clear removes every idea", async ({ page }) => {
    for (const text of ["One", "Two", "Three"]) await addIdea(page, { text });
    await expect(page.locator("#ideas .card")).toHaveCount(3);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("#ideas .card")).toHaveCount(0);
  });

  test("Clear on an empty list does nothing and the app keeps working", async ({ page }) => {
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("#ideas .card")).toHaveCount(0);
    await addIdea(page, { text: "After" });
    await expect(page.locator("#ideas .card")).toHaveCount(1);
  });

  test("Clear does not submit the form or wipe typed input", async ({ page }) => {
    await page.fill("#idea-text", "Draft");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("#ideas .card")).toHaveCount(0);
    await expect(page.locator("#idea-text")).toHaveValue("Draft");
  });

  test("× sits in the card's top-right corner and Clear sits below Suggest Idea", async ({ page }) => {
    await addIdea(page);
    const card = await page.locator("#ideas .card").boundingBox();
    const x = await page.locator("#ideas .delete-idea").boundingBox();
    await expect(page.locator("#ideas .delete-idea")).toBeVisible();
    expect(x.x + x.width).toBeLessThanOrEqual(card.x + card.width);
    expect(x.x).toBeGreaterThan(card.x + card.width / 2);
    expect(x.y - card.y).toBeLessThan(40);

    const submit = await page.getByRole("button", { name: "Suggest Idea" }).boundingBox();
    const clear = await page.getByRole("button", { name: "Clear" }).boundingBox();
    expect(clear.y).toBeGreaterThan(submit.y + submit.height - 1);
  });
});
