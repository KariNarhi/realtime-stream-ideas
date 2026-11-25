// Shared idea types (declaration-only: a .d.ts is never emitted, so no idea.js ends up in public/).
// Imported with the .js path, which resolves to this file. Used by the server and the tests via
// `import type`, and by the browser script via `import("./idea.js").Idea` (see render_submit.ts).

// What a viewer submits
export interface IdeaData {
  text: string;
  tech: string;
  viewer: string;
}

// What the server stores and sends: the submitted fields plus server-generated id and time
export interface Idea extends IdeaData {
  id: number;
  time: string;
}
