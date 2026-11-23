const feathers = require("@feathersjs/feathers");
const express = require("@feathersjs/express");
const socketio = require("@feathersjs/socketio");
const { NotFound } = require("@feathersjs/errors");
const moment = require("moment");

// Idea service
class IdeaService {
  constructor() {
    this.ideas = [];
    // Separate counter so ids stay unique after ideas are removed
    this.nextId = 0;
  }

  async find() {
    return this.ideas;
  }

  async create(data) {
    const idea = {
      id: this.nextId++,
      text: data.text,
      tech: data.tech,
      viewer: data.viewer
    };
    idea.time = moment().format("h:mm:ss a");

    this.ideas.push(idea);

    return idea;
  }

  // remove(id) deletes one idea; remove(null) deletes all of them.
  // Returns the removed idea(s) so Feathers emits a "removed" event for each.
  async remove(id) {
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

function createApp() {
  const app = express(feathers());

  // Parse JSON
  app.use(express.json());

  // Config socket.io realtime APIs. The client page is opened from file://
  // (or another origin), so Socket.io 3+ needs CORS enabled explicitly.
  app.configure(socketio({ cors: { origin: "*" } }));

  // Enable REST services
  app.configure(express.rest());

  // Register services
  app.use("/ideas", new IdeaService());

  // Return proper HTTP status codes for service errors (e.g. 404)
  app.use(express.errorHandler({ logger: false }));

  // New connections connect to stream channel
  app.on("connection", conn => app.channel("stream").join(conn));

  // Publish events to stream
  app.publish(data => app.channel("stream"));

  return app;
}

if (require.main === module) {
  const PORT = process.env.PORT || 3030;

  createApp()
    .listen(PORT)
    .then(() => console.log(`Realtime server running on port ${PORT}`));
}

module.exports = { IdeaService, createApp };

/* app.service("ideas").create({
  text: "Build a cool app",
  tech: "Node.js",
  viewer: "John Doe",
  time: moment().format("h:mm:ss a")
}); */
