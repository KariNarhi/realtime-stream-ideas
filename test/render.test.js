// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(process.cwd(), "public", "index.html"), "utf8");
const script = readFileSync(join(process.cwd(), "public", "render_submit.js"), "utf8");

let service, listeners, ioMock;

async function load(existing = []) {
  delete document.body.dataset.ready; // <body> survives between tests
  document.body.innerHTML = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, "");
  listeners = {};
  service = {
    create: vi.fn().mockResolvedValue({}),
    find: vi.fn().mockResolvedValue(existing),
    remove: vi.fn().mockResolvedValue({}),
    on: vi.fn((ev, fn) => (listeners[ev] = fn))
  };
  ioMock = vi.fn(() => "socket");
  const feathersMock = vi.fn(() => ({ configure: vi.fn(), service: () => service }));
  feathersMock.socketio = vi.fn(s => s);
  // Evaluate as a classic script so top-level function declarations become globals, like in the browser.
  const run = new Function("io", "feathers", `${script}\nreturn { renderIdea, sendIdea, init, deleteIdea, clearIdeas, removeIdeaCard };`);
  const api = run(ioMock, feathersMock);
  await new Promise(r => setTimeout(r));
  return { api, feathersMock };
}

const idea = (o = {}) => ({ id: 0, text: "Doom", tech: "mods", viewer: "Ann", time: "1:00:00 pm", ...o });

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
    const cards = document.querySelectorAll("#ideas .card");
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain("One");
    expect(cards[1].textContent).toContain("Two");
    expect(listeners.created).toBeTypeOf("function");
  });

  it("renders a card with text, tech, viewer and time", async () => {
    const { api } = await load();
    api.renderIdea(idea());
    const card = document.querySelector("#ideas .card");
    expect(card.querySelector("strong").textContent).toBe("(mods)");
    expect(card.textContent).toContain("Doom");
    expect(card.textContent).toContain("Submitted by Ann");
    expect(card.textContent).toContain("1:00:00 pm");
  });

  it("renders realtime ideas appended after existing ones", async () => {
    await load([idea({ text: "One" })]);
    listeners.created(idea({ text: "Two" }));
    const cards = document.querySelectorAll("#ideas .card");
    expect(cards).toHaveLength(2);
    expect(cards[1].textContent).toContain("Two");
  });

  it("KNOWN BUG: injects unescaped HTML from idea text", async () => {
    const { api } = await load();
    api.renderIdea(idea({ text: '<img src="x" id="pwned">' }));
    expect(document.getElementById("pwned")).not.toBeNull();
  });

  it("submitting the form creates an idea and clears inputs", async () => {
    await load();
    document.getElementById("idea-text").value = "Doom";
    document.getElementById("idea-tech").value = "mods";
    document.getElementById("idea-viewer").value = "Ann";
    const ev = new Event("submit", { cancelable: true });
    document.getElementById("form").dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(service.create).toHaveBeenCalledWith({ text: "Doom", tech: "mods", viewer: "Ann" });
    for (const id of ["idea-text", "idea-tech", "idea-viewer"]) {
      expect(document.getElementById(id).value).toBe("");
    }
  });

  describe("delete button", () => {
    it("renders an X delete button on each card", async () => {
      await load([idea({ id: 4 })]);
      const btn = document.querySelector("#ideas .card .delete-idea");
      expect(btn).not.toBeNull();
      expect(btn.textContent.trim()).toBe("\u00d7");
      expect(btn.closest(".card")).not.toBeNull();
      expect(btn.dataset.id).toBe("4");
      expect(btn.getAttribute("aria-label")).toBe("Delete idea");
    });

    it("clicking it removes that idea via the service", async () => {
      await load([idea({ id: 1 }), idea({ id: 2 })]);
      document.querySelectorAll(".delete-idea")[1].click();
      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith(2);
    });

    it("still works for cards rendered after the first ones", async () => {
      await load([idea({ id: 1 })]);
      listeners.created(idea({ id: 2 }));
      document.querySelectorAll(".delete-idea")[1].click();
      expect(service.remove).toHaveBeenCalledWith(2);
    });

    it("does not remove the card until the server confirms", async () => {
      await load([idea({ id: 1 })]);
      document.querySelector(".delete-idea").click();
      expect(document.querySelectorAll("#ideas .card")).toHaveLength(1);
    });

    it("removes only the matching card on a removed event", async () => {
      await load([idea({ id: 1, text: "One" }), idea({ id: 2, text: "Two" })]);
      expect(listeners.removed).toBeTypeOf("function");
      listeners.removed(idea({ id: 1 }));
      const cards = document.querySelectorAll("#ideas .card");
      expect(cards).toHaveLength(1);
      expect(cards[0].textContent).toContain("Two");
    });

    it("ignores a removed event for an idea that is not displayed", async () => {
      await load([idea({ id: 1 })]);
      expect(() => listeners.removed(idea({ id: 99 }))).not.toThrow();
      expect(document.querySelectorAll("#ideas .card")).toHaveLength(1);
    });
  });

  describe("clear button", () => {
    it("clicking it removes all ideas via remove(null)", async () => {
      await load([idea({ id: 1 })]);
      document.getElementById("clear").click();
      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith(null);
    });

    it("empties the list as removed events arrive", async () => {
      await load([idea({ id: 1 }), idea({ id: 2 })]);
      listeners.removed(idea({ id: 1 }));
      listeners.removed(idea({ id: 2 }));
      expect(document.querySelectorAll("#ideas .card")).toHaveLength(0);
    });

    it("does not submit the form", async () => {
      await load();
      document.getElementById("clear").click();
      expect(service.create).not.toHaveBeenCalled();
    });
  });
});
