import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRequire } from "node:module";
import { io } from "socket.io-client";

const { createApp } = createRequire(import.meta.url)("../app.js");

const emit = (socket, ...args) =>
  new Promise((resolve, reject) =>
    socket.emit(...args, (err, res) => (err ? reject(err) : resolve(res)))
  );
const once = (socket, event) => new Promise(resolve => socket.once(event, resolve));
const connect = url =>
  new Promise((resolve, reject) => {
    const s = io(url, { forceNew: true, transports: ["websocket"] });
    s.once("connect", () => resolve(s));
    s.once("connect_error", reject);
  });

let server, url, sockets;

beforeEach(async () => {
  sockets = [];
  server = await createApp().listen(0);
  url = `http://localhost:${server.address().port}`;
});

afterEach(async () => {
  sockets.forEach(s => s.close());
  await new Promise(r => server.close(r));
});

const client = async () => {
  const s = await connect(url);
  sockets.push(s);
  return s;
};

const post = body =>
  fetch(`${url}/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });

describe("REST", () => {
  it("POST /ideas creates and GET /ideas lists", async () => {
    const res = await post(JSON.stringify({ text: "a", tech: "b", viewer: "c" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ id: 0, text: "a", tech: "b", viewer: "c" });

    const list = await (await fetch(`${url}/ideas`)).json();
    expect(list).toHaveLength(1);
  });

  it("rejects malformed JSON", async () => {
    const res = await post("{not json");
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("Socket.io", () => {
  it("create and find work over the socket", async () => {
    const s = await client();
    const idea = await emit(s, "create", "ideas", { text: "a", tech: "b", viewer: "c" });
    expect(idea).toMatchObject({ id: 0, text: "a" });
    expect(await emit(s, "find", "ideas")).toHaveLength(1);
  });

  it("broadcasts created events to all connected clients", async () => {
    const [a, b] = [await client(), await client()];
    const gotA = once(a, "ideas created");
    const gotB = once(b, "ideas created");
    await emit(a, "create", "ideas", { text: "x", tech: "y", viewer: "z" });
    expect(await gotA).toMatchObject({ text: "x" });
    expect(await gotB).toMatchObject({ text: "x" });
  });

  it("broadcasts REST-created ideas to socket clients", async () => {
    const s = await client();
    const got = once(s, "ideas created");
    await post(JSON.stringify({ text: "rest", tech: "t", viewer: "v" }));
    expect(await got).toMatchObject({ text: "rest" });
  });

  it("late joiners get existing ideas via find only", async () => {
    const early = await client();
    await emit(early, "create", "ideas", { text: "old", tech: "t", viewer: "v" });
    const late = await client();
    let events = 0;
    late.on("ideas created", () => events++);
    expect(await emit(late, "find", "ideas")).toHaveLength(1);
    expect(events).toBe(0);
  });
});

describe("removing ideas", () => {
  const seed = async n => {
    for (let i = 0; i < n; i++) {
      await post(JSON.stringify({ text: `idea${i}`, tech: "t", viewer: "v" }));
    }
  };

  it("DELETE /ideas/:id removes one idea", async () => {
    await seed(2);
    const res = await fetch(`${url}/ideas/0`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 0, text: "idea0" });
    const list = await (await fetch(`${url}/ideas`)).json();
    expect(list.map(i => i.id)).toEqual([1]);
  });

  it("DELETE /ideas/:id returns 404 for an unknown id", async () => {
    const res = await fetch(`${url}/ideas/99`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("DELETE /ideas clears all ideas", async () => {
    await seed(3);
    const res = await fetch(`${url}/ideas`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(await (await fetch(`${url}/ideas`)).json()).toEqual([]);
  });

  it("broadcasts a removed event to all clients", async () => {
    await seed(1);
    const [a, b] = [await client(), await client()];
    const gotA = once(a, "ideas removed");
    const gotB = once(b, "ideas removed");
    await emit(a, "remove", "ideas", 0);
    expect(await gotA).toMatchObject({ id: 0 });
    expect(await gotB).toMatchObject({ id: 0 });
  });

  it("clearing over the socket emits one removed event per idea", async () => {
    await seed(3);
    const s = await client();
    const removedIds = [];
    s.on("ideas removed", idea => removedIds.push(idea.id));
    await emit(s, "remove", "ideas", null);
    await vi.waitFor(() => expect(removedIds.sort()).toEqual([0, 1, 2]));
    expect(await emit(s, "find", "ideas")).toEqual([]);
  });

  it("removing an unknown id over the socket returns an error", async () => {
    const s = await client();
    await expect(emit(s, "remove", "ideas", 7)).rejects.toMatchObject({ name: "NotFound" });
  });
});

describe("static front-end", () => {
  it("serves index.html at / with the app's scripts", async () => {
    const res = await fetch(`${url}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/html/);
    expect(await res.text()).toContain("render_submit.js");
  });

  it("serves the stylesheet and client script", async () => {
    expect((await fetch(`${url}/styles.css`)).headers.get("content-type")).toMatch(/css/);
    expect((await fetch(`${url}/render_submit.js`)).status).toBe(200);
  });

  it("does not expose server files", async () => {
    for (const file of ["app.js", "package.json", "node_modules/moment/package.json"]) {
      expect((await fetch(`${url}/${file}`)).status).toBe(404);
    }
  });
});

describe("CORS", () => {
  it("allows Socket.io polling requests from other origins (e.g. file://)", async () => {
    const res = await fetch(`${url}/socket.io/?EIO=4&transport=polling`, {
      headers: { Origin: "null" }
    });
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });
});

describe("createApp", () => {
  it("returns independent apps with independent state", async () => {
    const other = await createApp().listen(0);
    try {
      await post(JSON.stringify({ text: "a", tech: "b", viewer: "c" }));
      const list = await (
        await fetch(`http://localhost:${other.address().port}/ideas`)
      ).json();
      expect(list).toEqual([]);
    } finally {
      await new Promise(r => other.close(r));
    }
  });
});
