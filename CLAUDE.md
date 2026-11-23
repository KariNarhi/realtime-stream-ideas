# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm start` — run the server (`node app`) on `localhost:3030` (override with `PORT`)
- Open `index.html` directly in a browser to use the client (it is not served by the Express app).

- `npm test` — run Vitest (`test/`); single file: `npx vitest run test/idea-service.test.js`

There is no build or lint setup. `app.js` exports `{ IdeaService, createApp }` and only listens when run directly. `render_submit.js` is a classic browser script with no exports; tests evaluate its source with stubbed `io`/`feathers`.

## Architecture

Styling lives in `styles.css` (GTA VI palette as CSS variables, Bebas Neue + Poppins), loaded after Bootstrap in `index.html`; cards rendered by `render_submit.js` use the `idea-card`/`delete-idea` classes.

Small real-time app where viewers submit ideas for a livestream. Two halves:

- **Server (`app.js`)** — Feathers v5 on Express with Socket.io and REST. A single in-memory `IdeaService` (`find`, `create`, `remove`; `remove(null)` clears all) is mounted at `/ideas`; ideas are lost on restart and ids come from an incrementing counter. All connections join the `stream` channel and every service event is published to it, which is what pushes `created` events to all clients.
- **Client (`index.html` + `render_submit.js`)** — plain browser scripts, no bundler. Feathers client and Socket.io are loaded from CDNs and connect to a hardcoded `http://localhost:3030`. `render_submit.js` submits the form via `app.service("ideas").create`, loads existing ideas with `find`, and renders new ones on the `created` event.

The browser loads `@feathersjs/client@5.0.51` and Socket.io client 4.x from CDNs, matching the Feathers 5 / Socket.io 4 server. Keep client and server versions in step when upgrading either.

`renderIdea` interpolates user input into `innerHTML` unescaped (XSS risk).
