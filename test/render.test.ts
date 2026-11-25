// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";
import type { Idea } from "../src/app.ts";

const html = readFileSync(join(process.cwd(), "public", "index.html"), "utf8");
// The browser script is TypeScript; strip the types so it can be evaluated like the compiled output
const script = stripTypeScriptTypes(readFileSync(join(process.cwd(), "src", "render_submit.ts"), "utf8"));

type Listener = (idea: Idea) => void;
let service: {
  create: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
};
let listeners: Record<string, Listener>;
let ioMock: ReturnType<typeof vi.fn>;

const byId = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
const first = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector(selector) as T;
const all = (selector: string) => document.querySelectorAll<HTMLElement>(selector);


async function load(existing: Idea[] = []) {
  delete document.body.dataset.ready; // <body> survives between tests
  document.body.innerHTML = html.match(/<body[^>]*>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, "");
  listeners = {};
  service = {
    create: vi.fn().mockResolvedValue({}),
    find: vi.fn().mockResolvedValue(existing),
    remove: vi.fn().mockResolvedValue({}),
    on: vi.fn((ev: string, fn: Listener) => (listeners[ev] = fn))
  };
  ioMock = vi.fn(() => "socket");
  const feathersMock = Object.assign(vi.fn(() => ({ configure: vi.fn(), service: () => service })), { socketio: vi.fn() });
  feathersMock.socketio = vi.fn((s: unknown) => s);
  // Evaluate as a classic script so top-level function declarations become globals, like in the browser.
  const run = new Function("io", "feathers", `${script}\nreturn { renderIdea, sendIdea, init, deleteIdea, clearIdeas, removeIdeaCard };`);
  const api = run(ioMock, feathersMock);
  await new Promise(r => setTimeout(r));
  return { api, feathersMock };
}

const idea = (o: Partial<Idea> = {}): Idea => ({ id: 0, text: "Doom", tech: "mods", viewer: "Ann", time: "1:00:00 pm", ...o });

describe("client script", () => {
  it("connects to the same origin", async () => {
    await load();
    expect(ioMock).toHaveBeenCalledWith();
  });

  it("marks the page ready once listeners are registered", async () => {
    await load();
    expect(document.body.dataset.ready).toBe("true");
  });

  it("renders existing ideas from find() and listens for created", async () => {
    await load([idea({ text: "One" }), idea({ text: "Two" })]);
    const cards = all("#ideas .card");
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain("One");
    expect(cards[1].textContent).toContain("Two");
    expect(listeners.created).toBeTypeOf("function");
  });

  it("renders a card with text, tech, viewer and time", async () => {
    const { api } = await load();
    api.renderIdea(idea());
    const card = first("#ideas .card");
    expect(card.querySelector("strong")!.textContent).toBe("(mods)");
    expect(card.textContent).toContain("Doom");
    expect(card.textContent).toContain("Submitted by Ann");
    expect(card.textContent).toContain("1:00:00 pm");
  });

  it("renders realtime ideas appended after existing ones", async () => {
    await load([idea({ text: "One" })]);
    listeners.created(idea({ text: "Two" }));
    const cards = all("#ideas .card");
    expect(cards).toHaveLength(2);
    expect(cards[1].textContent).toContain("Two");
  });

  it("escapes HTML in idea text", async () => {
    const { api } = await load();
    api.renderIdea(idea({ text: '<img src="x" id="pwned">' }));
    expect(document.getElementById("pwned")).toBeNull();
    expect(first("#ideas .lead").textContent).toContain('<img src="x" id="pwned">');
  });

  it("escapes HTML in tech, viewer and time", async () => {
    const { api } = await load();
    api.renderIdea(idea({ tech: "<b id=t>", viewer: "<i id=v>", time: "<u id=m>" }));
    expect(document.querySelector("#t, #v, #m")).toBeNull();
    const text = first("#ideas .card").textContent!;
    expect(text).toContain("<b id=t>");
    expect(text).toContain("<i id=v>");
    expect(text).toContain("<u id=m>");
  });

  it("submitting the form creates an idea and clears inputs", async () => {
    await load();
    byId("idea-text").value = "Doom";
    byId("idea-tech").value = "mods";
    byId("idea-viewer").value = "Ann";
    const ev = new Event("submit", { cancelable: true });
    byId("form").dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(service.create).toHaveBeenCalledWith({ text: "Doom", tech: "mods", viewer: "Ann" });
    for (const id of ["idea-text", "idea-tech", "idea-viewer"]) {
      expect(byId(id).value).toBe("");
    }
  });

  describe("delete button", () => {
    it("renders an X delete button on each card", async () => {
      await load([idea({ id: 4 })]);
      const btn = first("#ideas .card .delete-idea");
      expect(btn).not.toBeNull();
      expect(btn.textContent!.trim()).toBe("\u00d7");
      expect(btn.closest(".card")).not.toBeNull();
      expect(btn.dataset.id).toBe("4");
      expect(btn.getAttribute("aria-label")).toBe("Delete idea");
    });

    it("clicking it removes that idea via the service", async () => {
      await load([idea({ id: 1 }), idea({ id: 2 })]);
      all(".delete-idea")[1].click();
      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith(2);
    });

    it("still works for cards rendered after the first ones", async () => {
      await load([idea({ id: 1 })]);
      listeners.created(idea({ id: 2 }));
      all(".delete-idea")[1].click();
      expect(service.remove).toHaveBeenCalledWith(2);
    });

    it("does not remove the card until the server confirms", async () => {
      await load([idea({ id: 1 })]);
      first(".delete-idea").click();
      expect(all("#ideas .card")).toHaveLength(1);
    });

    it("removes only the matching card on a removed event", async () => {
      await load([idea({ id: 1, text: "One" }), idea({ id: 2, text: "Two" })]);
      expect(listeners.removed).toBeTypeOf("function");
      listeners.removed(idea({ id: 1 }));
      const cards = all("#ideas .card");
      expect(cards).toHaveLength(1);
      expect(cards[0].textContent).toContain("Two");
    });

    it("ignores a removed event for an idea that is not displayed", async () => {
      await load([idea({ id: 1 })]);
      expect(() => listeners.removed(idea({ id: 99 }))).not.toThrow();
      expect(all("#ideas .card")).toHaveLength(1);
    });
  });

  describe("clear button", () => {
    it("clicking it removes all ideas via remove(null)", async () => {
      await load([idea({ id: 1 })]);
      byId("clear").click();
      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith(null);
    });

    it("empties the list as removed events arrive", async () => {
      await load([idea({ id: 1 }), idea({ id: 2 })]);
      listeners.removed(idea({ id: 1 }));
      listeners.removed(idea({ id: 2 }));
      expect(all("#ideas .card")).toHaveLength(0);
    });

    it("does not submit the form", async () => {
      await load();
      byId("clear").click();
      expect(service.create).not.toHaveBeenCalled();
    });
  });
});
