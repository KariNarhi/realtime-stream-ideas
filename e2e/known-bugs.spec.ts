import { test, expect, openApp, addIdea } from "./fixtures.ts";

// Documented bugs: marked test.fail() so they pass while the bug exists and
// turn red (prompting removal of the marker) once the bug is fixed.
test.describe("known bugs", () => {
  test("XSS: idea text must not be rendered as HTML", async ({ page }) => {
    test.fail(true, "renderIdea() interpolates user input into innerHTML unescaped");
    await openApp(page);
    await addIdea(page, { text: "<img src=data: onerror=__x=1>" });
    await expect(page.locator("#ideas .card")).toHaveCount(1);
    // Fixed behaviour: the markup is shown as text, so no <img> element is created
    await expect(page.locator("#ideas img"), "user input became an element").toHaveCount(0, { timeout: 1000 });
  });
});
