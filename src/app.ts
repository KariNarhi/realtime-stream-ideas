import { feathers } from "@feathersjs/feathers";
import expressModule from "@feathersjs/express";
import socketio from "@feathersjs/socketio";
import { NotFound } from "@feathersjs/errors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import moment from "moment";
// Type-only: brings in the app.channel()/app.publish() typings added by transport-commons
import type {} from "@feathersjs/transport-commons";
import type { Idea, IdeaData } from "./idea.js";

// Data flow: a client (socket or REST) calls IdeaService -> Feathers emits "created"/"removed"
// with the returned idea -> app.publish sends the event to the "stream" channel -> every
// connected client receives it. The server never talks to the DOM; clients render events.

// Node's ESM interop hands us module.exports (the callable express function with
// json/rest/... attached), while the typings describe it as a namespace with a default export.
const feathersExpress = expressModule as unknown as typeof expressModule.default &
  Omit<typeof expressModule, "default">;

// Idea service: in-memory store (lost on restart). Feathers calls these methods for both
// REST and Socket.io, and turns each return value into the payload of a service event.
export class IdeaService {
  ideas: Idea[] = [];
  // Separate counter so ids stay unique after ideas are removed
  nextId = 0;

  async find(): Promise<Idea[]> {
    return this.ideas;
  }

  async create(data: IdeaData): Promise<Idea> {
    // Only the three form fields are copied; the server owns id and time, so a client
    // cannot set them. Fields are not validated or sanitised here (the client escapes on render).
    const idea: Idea = {
      id: this.nextId++,
      text: data.text,
      tech: data.tech,
      viewer: data.viewer,
      time: moment().format("h:mm:ss a")
    };

    this.ideas.push(idea);

    return idea;
  }

  // remove(id) deletes one idea; remove(null) deletes all of them.
  // Returns the removed idea(s) so Feathers emits a "removed" event for each.
  async remove(id: number | string | null): Promise<Idea | Idea[]> {
    if (id === null || id === undefined) {
      const removed = this.ideas;
      this.ideas = [];
      return removed;
    }

    // REST passes ids as strings
    const index = this.ideas.findIndex(idea => idea.id === Number(id));
    if (index === -1) {
      throw new NotFound(`No idea found with id '${id}'`);
    }
    return this.ideas.splice(index, 1)[0];
  }
}

export function createApp() {
  // A fresh app (and fresh IdeaService) per call, so tests get isolated state
  const app = feathersExpress(feathers());

  // Parse JSON
  app.use(feathersExpress.json());

  // Config socket.io realtime APIs. The client page is opened from file://
  // (or another origin), so Socket.io 3+ needs CORS enabled explicitly.
  app.configure(socketio({ cors: { origin: "*" } }));

  // Enable REST services
  app.configure(feathersExpress.rest());

  // Serve the front-end (only public/, never app.js or package.json)
  app.use("/", feathersExpress.serveStatic(path.join(import.meta.dirname, "..", "public")));

  // Register services: one service, reachable over REST (/ideas) and Socket.io ("ideas")
  app.use("/ideas", new IdeaService());

  // Return proper HTTP status codes for service errors (e.g. 404)
  app.use(feathersExpress.errorHandler({ logger: false }));

  // New connections connect to stream channel (every socket client joins it)
  app.on("connection", (conn: object) => app.channel("stream").join(conn));

  // Publish events to stream: this is what pushes created/removed to all viewers,
  // including ones triggered through REST
  app.publish(() => app.channel("stream"));

  return app;
}

// Only listen when run directly (node src/app.ts); tests import createApp() instead
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 3030;

  createApp()
    .listen(PORT)
    .then(() => console.log(`Realtime server running on port ${PORT}`));
}

/* app.service("ideas").create({
  text: "Build a cool app",
  tech: "Node.js",
  viewer: "John Doe",
  time: moment().format("h:mm:ss a")
}); */
