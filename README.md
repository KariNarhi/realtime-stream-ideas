# realtime-stream-ideas
Simple app for viewers to suggest ideas for livestreaming.
Based on the Real-time App With Feathers.js, Socket.io & Express by Traversy Media

## Quick Start

```bash
# Install dependencies
npm install

# Serve on localhost:3030
npm start

# Open index.html in a browser (it is not served by the app)
```

The server listens on port 3030 by default; set `PORT` to change it. Note that `render_submit.js` connects to a hardcoded `http://localhost:3030`, so change it there too if you use another port.

Ideas are stored in memory and are lost when the server restarts.

## Testing

Tests use [Vitest](https://vitest.dev/) (with jsdom for the browser-side tests).

```bash
# Run all tests once
npm test

# Run a single test file
npx vitest run test/idea-service.test.js
```

| File | Covers |
| --- | --- |
| `test/idea-service.test.js` | `IdeaService` unit tests |
| `test/app.integration.test.js` | REST and Socket.io API against a real server, including realtime broadcasts |
| `test/render.test.js` | Client script behavior (rendering, form submit) with mocked `io`/`feathers` |
| `test/index-html.test.js` | Form fields, validation attributes and script order in `index.html` |
