const { test, expect, openApp, addIdea } = require("./fixtures");

test.describe("submitting ideas", () => {
  test.beforeEach(async ({ page }) => openApp(page));

  test("shows a card with the idea details and clears the form", async ({ page }) => {
    await addIdea(page, { text: "Doom", tech: "Mods", viewer: "Ann" });
    const card = page.locator("#ideas .card");
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Doom");
    await expect(card.locator("strong")).toHaveText("(Mods)");
    await expect(card).toContainText("Submitted by Ann");
    await expect(card.locator("small")).toHaveText(/^\d{1,2}:\d{2}:\d{2} (am|pm)$/);
    for (const id of ["idea-text", "idea-tech", "idea-viewer"]) {
      await expect(page.locator(`#${id}`)).toHaveValue("");
    }
  });

  test("does not submit when a required field is empty", async ({ page }) => {
    await page.fill("#idea-text", "Doom");
    await page.fill("#idea-tech", "Mods");
    // viewer name left empty
    await page.click('#form button[type="submit"]');
    await expect(page.locator("#idea-viewer")).toHaveJSProperty("validity.valueMissing", true);
    await expect(page.locator("#ideas .card")).toHaveCount(0);
    await expect(page.locator("#idea-text")).toHaveValue("Doom"); // input kept
  });

  test.describe("maxlength", () => {
    for (const [id, max] of [["idea-text", 30], ["idea-tech", 30], ["idea-viewer", 20]]) {
      test(`#${id} accepts at most ${max} characters`, async ({ page }) => {
        const input = page.locator(`#${id}`);
        await input.pressSequentially("x".repeat(max + 10));
        await expect(input).toHaveValue("x".repeat(max));
      });
    }
  });

  test("lists several ideas in submission order, each with a delete button", async ({ page }) => {
    for (const text of ["First", "Second", "Third"]) await addIdea(page, { text });
    const cards = page.locator("#ideas .card");
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toContainText("First");
    await expect(cards.nth(1)).toContainText("Second");
    await expect(cards.nth(2)).toContainText("Third");
    await expect(page.locator("#ideas .delete-idea")).toHaveCount(3);
  });

  test("keeps submitted ideas after a reload (state lives on the server)", async ({ page }) => {
    await addIdea(page, { text: "Persistent" });
    await expect(page.locator("#ideas .card")).toHaveCount(1);
    await page.reload();
    await page.waitForSelector('body[data-ready="true"]');
    await expect(page.locator("#ideas .card")).toHaveCount(1);
    await expect(page.locator("#ideas .card")).toContainText("Persistent");
  });
});
