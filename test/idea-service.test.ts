import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { IdeaService, type Idea, type IdeaData } from "../src/app.ts";

describe("IdeaService", () => {
  let service: IdeaService;
  beforeEach(() => {
    service = new IdeaService();
  });

  it("find() returns an empty list initially", async () => {
    expect(await service.find()).toEqual([]);
  });

  it("create() copies text, tech and viewer", async () => {
    const idea = await service.create({ text: "Doom", tech: "mods", viewer: "Ann" });
    expect(idea).toMatchObject({ text: "Doom", tech: "mods", viewer: "Ann" });
  });

  it("create() assigns sequential ids", async () => {
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      ids.push((await service.create({ text: "a", tech: "b", viewer: "c" })).id);
    }
    expect(ids).toEqual([0, 1, 2]);
  });

  it("find() returns ideas in insertion order", async () => {
    await service.create({ text: "first", tech: "t", viewer: "v" });
    await service.create({ text: "second", tech: "t", viewer: "v" });
    expect((await service.find()).map((i: Idea) => i.text)).toEqual(["first", "second"]);
  });

  it("ignores unknown fields and client-supplied id/time", async () => {
    const idea = await service.create({
      id: 99,
      time: "bogus",
      extra: "x",
      text: "a",
      tech: "b",
      viewer: "c"
    } as IdeaData);
    expect(idea.id).toBe(0);
    expect(idea.time).not.toBe("bogus");
    expect(idea).not.toHaveProperty("extra");
  });

  it("leaves missing fields undefined (no validation)", async () => {
    const idea = await service.create({} as never);
    expect(idea.text).toBeUndefined();
    expect(idea.tech).toBeUndefined();
    expect(idea.viewer).toBeUndefined();
  });

  it("instances do not share state", async () => {
    await service.create({ text: "a", tech: "b", viewer: "c" });
    expect(await new IdeaService().find()).toEqual([]);
  });

  describe("remove", () => {
    const add = (text: string) => service.create({ text, tech: "t", viewer: "v" });

    it("removes and returns a single idea by id", async () => {
      await add("a");
      const b = await add("b");
      await add("c");
      expect(await service.remove(b.id)).toEqual(b);
      expect((await service.find()).map((i: Idea) => i.text)).toEqual(["a", "c"]);
    });

    it("accepts string ids (as sent over REST)", async () => {
      const a = await add("a");
      await service.remove(String(a.id));
      expect(await service.find()).toEqual([]);
    });

    it("throws NotFound for an unknown id", async () => {
      await add("a");
      await expect(service.remove(42)).rejects.toMatchObject({ name: "NotFound", code: 404 });
      expect(await service.find()).toHaveLength(1);
    });

    it("remove(null) clears all ideas and returns them", async () => {
      await add("a");
      await add("b");
      const removed = (await service.remove(null)) as Idea[];
      expect(removed.map((i: Idea) => i.text)).toEqual(["a", "b"]);
      expect(await service.find()).toEqual([]);
    });

    it("remove(null) on an empty list returns an empty array", async () => {
      expect(await service.remove(null)).toEqual([]);
    });

    it("does not reuse ids after removal", async () => {
      await add("a");
      const b = await add("b");
      await service.remove(0);
      const c = await add("c");
      expect(c.id).not.toBe(b.id);
      expect(c.id).toBe(2);
    });

    it("keeps ids unique after clearing", async () => {
      await add("a");
      await service.remove(null);
      expect((await add("b")).id).toBe(1);
    });
  });

  describe("time", () => {
    afterEach(() => vi.useRealTimers());

    it("is formatted as h:mm:ss a", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 14, 5, 9));
      const idea = await service.create({ text: "a", tech: "b", viewer: "c" });
      expect(idea.time).toBe("2:05:09 pm");
    });
  });
});
