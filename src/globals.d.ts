// Globals provided by the CDN scripts loaded in index.html.
// Only the small part of the Feathers/Socket.io client API that render_submit.ts uses is typed.

/** Client-side proxy for a server service; calls go to the server over the socket. */
interface FeathersService<T> {
  /** Sends a new item to the server. The result (and the "created" event) comes from the server. */
  create(data: Partial<T>): Promise<T>;
  /** Fetches all items the server currently has. */
  find(): Promise<T[]>;
  /**
   * Removes one item, or every item when `id` is `null`.
   * @param id Id of the item to remove, or `null` for all.
   */
  remove(id: number | null): Promise<T | T[]>;
  /**
   * Subscribes to events the server publishes to every connected client.
   * @param event "created" or "removed" (one event per affected item).
   * @param listener Called with the item the event is about.
   */
  on(event: "created" | "removed", listener: (data: T) => void): void;
}

/** The Feathers client app: configured with a transport, then used to reach services. */
interface FeathersApp {
  /** Registers a transport plugin such as `feathers.socketio(socket)`. */
  configure(plugin: unknown): void;
  /** Returns the proxy for the server's "ideas" service. */
  service(name: "ideas"): FeathersService<Idea>;
}

/** Socket.io client; connects to the same origin the page was served from. */
declare function io(): unknown;
/** Creates a Feathers client app. */
declare function feathers(): FeathersApp;
declare namespace feathers {
  /** Feathers transport plugin that talks over the given Socket.io connection. */
  function socketio(socket: unknown): unknown;
}
