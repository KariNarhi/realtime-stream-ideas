// Globals provided by the CDN scripts loaded in index.html.
// Only the small part of the Feathers/Socket.io client API that render_submit.ts uses is typed.
interface FeathersService<T> {
  create(data: Partial<T>): Promise<T>;
  find(): Promise<T[]>;
  remove(id: number | null): Promise<T | T[]>;
  on(event: "created" | "removed", listener: (data: T) => void): void;
}

interface FeathersApp {
  configure(plugin: unknown): void;
  service(name: "ideas"): FeathersService<Idea>;
}

declare function io(): unknown;
declare function feathers(): FeathersApp;
declare namespace feathers {
  function socketio(socket: unknown): unknown;
}
