// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const doc = new DOMParser().parseFromString(
  readFileSync(join(process.cwd(), "index.html"), "utf8"),
  "text/html"
);

describe("index.html", () => {
  it.each([
    ["idea-text", "30"],
    ["idea-tech", "30"],
    ["idea-viewer", "20"]
  ])("input #%s is required with maxlength %s", (id, max) => {
    const el = doc.getElementById(id);
    expect(el.closest("#form")).not.toBeNull();
    expect(el.required).toBe(true);
    expect(el.getAttribute("maxlength")).toBe(max);
  });

  it("has a Clear button below the submit button", () => {
    const clear = doc.getElementById("clear");
    const submit = doc.querySelector('#form button[type="submit"]');
    expect(clear.textContent.trim()).toBe("Clear");
    // type=button so it never submits the form
    expect(clear.getAttribute("type")).toBe("button");
    expect(clear.closest("#form")).not.toBeNull();
    expect(submit.compareDocumentPosition(clear) & 4).toBeTruthy(); // clear follows submit
  });

  it("loads the custom stylesheet after Bootstrap, plus the display and body fonts", () => {
    const hrefs = [...doc.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute("href"));
    expect(hrefs.findIndex(h => /bootstrap/.test(h))).toBeLessThan(hrefs.indexOf("./styles.css"));
    expect(hrefs.some(h => /fonts\.googleapis\.com.*Bebas\+Neue.*Poppins/.test(h))).toBe(true);
  });

  it("uses the app theme classes instead of Bootstrap's light/dark ones", () => {
    expect(doc.body.classList.contains("app-body")).toBe(true);
    expect(doc.querySelector("nav").classList.contains("app-nav")).toBe(true);
    expect(doc.getElementById("clear").classList.contains("btn-clear")).toBe(true);
    expect(doc.querySelector('#form button[type="submit"]').classList.contains("btn-suggest")).toBe(true);
    for (const id of ["idea-text", "idea-tech", "idea-viewer"]) {
      expect(doc.getElementById(id).classList.contains("app-input")).toBe(true);
    }
  });

  it("has an #ideas container", () => {
    expect(doc.getElementById("ideas")).not.toBeNull();
  });

  it("loads feathers client 5, socket.io 4, then render_submit.js", () => {
    const srcs = [...doc.querySelectorAll("script[src]")].map(s => s.getAttribute("src"));
    expect(srcs[0]).toMatch(/@feathersjs\/client@5\./);
    expect(srcs[1]).toMatch(/socket\.io\/4\./);
    expect(srcs[2]).toBe("./render_submit.js");
  });
});
