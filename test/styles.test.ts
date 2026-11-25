import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (f: string) => readFileSync(join(process.cwd(), "public", f), "utf8");
// Theme and app-specific styles together, as loaded by index.html
const css = read("gta-vi-theme.css") + read("styles.css");

describe("gta-vi-theme.css + styles.css", () => {
  it.each([
    ["--deep-violet", "#3b146b"],
    ["--purple", "#7b208f"],
    ["--magenta", "#c9349b"],
    ["--coral-pink", "#f36a78"],
    ["--coral", "#f87572"],
    ["--orange", "#ff9b55"],
    ["--warm-yellow", "#ffb458"]
  ])("defines the GTA VI palette color %s as %s", (name, hex) => {
    expect(css).toMatch(new RegExp(`${name}:\\s*${hex}`, "i"));
  });

  it("defines display and body fonts", () => {
    expect(css).toMatch(/--font-display:\s*"Bebas Neue"/);
    expect(css).toMatch(/--font-body:\s*"Poppins"/);
  });

  it("styles every class the markup relies on", () => {
    for (const cls of [".app-body", ".app-nav", ".app-title", ".app-input", ".btn-suggest", ".btn-clear", ".idea-card", ".delete-idea"]) {
      expect(css).toContain(cls);
    }
  });
});
