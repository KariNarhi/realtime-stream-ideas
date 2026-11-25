// Shared test helpers (no test framework imports, so unit and e2e tests can both use them).
import type { IdeaData } from "../src/idea.js";

// A valid submission; override single fields when a test cares about them
export const ideaData = (overrides: Partial<IdeaData> = {}): IdeaData => ({
  text: "a",
  tech: "b",
  viewer: "c",
  ...overrides
});

// The form's input ids, in field order (text, tech, viewer)
export const FIELD_IDS = ["idea-text", "idea-tech", "idea-viewer"] as const;

// maxlength of each input in public/index.html. index.html is static and cannot import this,
// so index-html.test.ts checks the markup against it and the e2e test checks the browser enforces it.
export const MAX_LENGTH = { "idea-text": 30, "idea-tech": 30, "idea-viewer": 20 } as const;
