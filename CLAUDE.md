# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm run build` — compile the browser script; `npm run typecheck` — type-check server, tests, e2e and client
- `npm start` — build, then run the server (`node src/app.ts`) on `localhost:3030` (override with `PORT`)
- Open `http://localhost:3030` to use the app.

- `npm run test:e2e` — Playwright E2E tests (Chromium + Firefox, `e2e/`, server on port 3100; first run `npx playwright install chromium firefox`)
- `npm run test:e2e:ui` — Playwright UI mode; `npm run test:e2e:report` — open the HTML report (reporters: list + html locally, dot when `CI` is set)
- `npm run test:ui` — Vitest UI; `npm run test:report` — open the Vitest HTML report in `.vitest/` (reporters: default + html locally, dot when `CI` is set)
- `npm test` — run Vitest (`test/`); single file: `npx vitest run test/idea-service.test.ts`

The project is TypeScript (ESM, erasable syntax only). The server (`src/app.ts`) runs directly with Node's native type stripping (Node >= 22.18), so relative imports use the `.ts` extension. The browser script `src/render_submit.ts` is compiled by `npm run build` (`tsconfig.client.json`) to `public/render_submit.js` (git-ignored); `npm start`, Vitest (global setup) and the Playwright web server run the build automatically. `npm run typecheck` checks both tsconfigs. There is no lint setup. `src/app.ts` exports `{ IdeaService, createApp }` and only listens when run directly. `src/render_submit.ts` is a classic browser script with no imports/exports (CDN globals typed in `src/globals.d.ts`); unit tests strip its types and evaluate it with stubbed `io`/`feathers`.

## Architecture

Styling: `public/gta-vi-theme.css` is the portable GTA VI theme (palette as CSS variables, Bebas Neue + Poppins, navbar/title/inputs/buttons); `public/styles.css` holds app-specific card styles. Both load after Bootstrap in `index.html`; cards rendered by `src/render_submit.ts` use the `idea-card`/`delete-idea` classes.

Small real-time app where viewers submit ideas for a livestream. Two halves:

- **Server (`src/app.ts`)** — Feathers v5 on Express with Socket.io and REST. A single in-memory `IdeaService` (`find`, `create`, `remove`; `remove(null)` clears all) is mounted at `/ideas`; ideas are lost on restart and ids come from an incrementing counter. All connections join the `stream` channel and every service event is published to it, which is what pushes `created` events to all clients.
- **Client (`public/index.html` + `src/render_submit.ts`, compiled to `public/render_submit.js`)** — plain browser scripts compiled with `tsc`, no bundler, served statically by the Express app from `public/` only. Feathers client and Socket.io are loaded from CDNs and connect to the same origin (`io()`). E2E tests serve those CDN files from `node_modules` via `page.route` (`e2e/fixtures.ts`); `body[data-ready]` signals when the client finished loading. `src/render_submit.ts` submits the form via `app.service("ideas").create`, loads existing ideas with `find`, and renders new ones on the `created` event.

The browser loads `@feathersjs/client@5.0.51` and Socket.io client 4.x from CDNs, matching the Feathers 5 / Socket.io 4 server. Keep client and server versions in step when upgrading either.

`renderIdea` interpolates user input into `innerHTML` unescaped (XSS risk).
