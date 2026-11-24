# realtime-stream-ideas
Simple app for viewers to suggest ideas for livestreaming.
Based on the Real-time App With Feathers.js, Socket.io & Express by Traversy Media

## Quick Start

```bash
# Install dependencies
npm install

# Serve on localhost:3030
npm start

# Open http://localhost:3030 in a browser
```

The server serves the front-end from `public/` and listens on port 3030 by default; set `PORT` to change it. The client connects back to the same origin, so no other change is needed.

Ideas are stored in memory and are lost when the server restarts.

## Testing

Tests use [Vitest](https://vitest.dev/) (with jsdom for the browser-side tests).

```bash
# Run all tests once
npm test

# Run a single test file
npx vitest run test/idea-service.test.js

# Interactive Vitest UI (watch mode)
npm run test:ui

# Open the HTML report of the last run (.vitest/)
npm run test:report
```

Locally `npm test` prints the default report and writes an HTML report; when the `CI` environment variable is set, it uses the compact `dot` reporter instead.

| File | Covers |
| --- | --- |
| `test/idea-service.test.js` | `IdeaService` unit tests |
| `test/app.integration.test.js` | REST and Socket.io API against a real server, including realtime broadcasts |
| `test/render.test.js` | Client script behavior (rendering, form submit) with mocked `io`/`feathers` |
| `test/index-html.test.js` | Form fields, validation attributes and script order in `index.html` |

## End-to-end tests

[Playwright](https://playwright.dev/) tests in `e2e/` drive the real app in Chromium and Firefox, including two-viewer realtime sync.

```bash
# One-time: download the browsers (stored in ~/Library/Caches/ms-playwright on macOS)
npx playwright install chromium firefox

# Run the E2E tests (starts its own server on port 3100)
npm run test:e2e

# One browser / one file
npx playwright test --project=chromium e2e/realtime.spec.js

# Interactive UI mode
npm run test:e2e:ui

# Open the HTML report of the last run (playwright-report/)
npm run test:e2e:report
```

Locally the tests print a live list and write an HTML report; when the `CI` environment variable is set, they use the compact `dot` reporter instead.

The tests are hermetic: the Feathers client, Socket.io client and Bootstrap CDN requests are served from `node_modules`, and Google Fonts requests are blocked, so no network access is needed. Any browser console error, page error or failed request fails the test. Tests run serially because ideas are kept in memory on the server.
