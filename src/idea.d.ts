// Shared idea types (declaration-only: a .d.ts is never emitted, so no idea.js ends up in public/).
// Imported with the .js path, which resolves to this file. Used by the server and the tests via
// `import type`, and by the browser script via `import("./idea.js").Idea` (see render_submit.ts).

/** What a viewer submits through the form. */
export interface IdeaData {
  /** The game idea itself. */
  text: string;
  /** The technology the idea would use. */
  tech: string;
  /** Name of the viewer who suggested it. */
  viewer: string;
}

/** What the server stores and sends: the submitted fields plus server-generated `id` and `time`. */
export interface Idea extends IdeaData {
  /** Unique per server run and never reused, even after removals. */
  id: number;
  /** Creation time formatted as `h:mm:ss a` (e.g. `2:05:09 pm`). */
  time: string;
}
