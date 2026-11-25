// Shared with the server. A type-only import *expression* (not an `import` statement) keeps this
// file a classic browser script; it is erased on compile, so nothing is loaded at runtime.
type Idea = import("./idea.js").Idea;

// Flow: the form calls the "ideas" service; the server answers by emitting "created" to every
// viewer (including the sender), and "removed" for deletes. The page only changes in those
// event handlers (see init), so all viewers stay in sync.

// Socket.io setup
const socket = io();
// Init feathers app
const app = feathers();
// Register socket.io to talk to server
app.configure(feathers.socketio(socket));
document.getElementById("form")!.addEventListener("submit", sendIdea);
document.getElementById("clear")!.addEventListener("click", clearIdeas);
// Delegated: cards are re-created whenever a new idea is rendered
document.getElementById("ideas")!.addEventListener("click", e => {
  const button = (e.target as Element).closest<HTMLElement>(".delete-idea");
  if (button) deleteIdea(button.dataset.id!);
});
/**
 * Form submit handler: sends the typed idea to the server and clears the inputs.
 * @param e The submit event (its default page reload is prevented).
 */
async function sendIdea(e: Event) {
  e.preventDefault();
  const text = document.getElementById("idea-text") as HTMLInputElement;
  const tech = document.getElementById("idea-tech") as HTMLInputElement;
  const viewer = document.getElementById("idea-viewer") as HTMLInputElement;
  // Create new idea. Nothing is rendered here: the card appears when the "created" event arrives.
  app.service("ideas").create({
    text: text.value,
    tech: tech.value,
    viewer: viewer.value
  });
  // Clear inputs
  text.value = "";
  tech.value = "";
  viewer.value = "";
}
/**
 * Asks the server to delete one idea. The card is removed when the server's "removed" event arrives.
 * @param id The idea id, as read from the button's `data-id` attribute.
 */
function deleteIdea(id: string) {
  return app.service("ideas").remove(Number(id));
}
/** Asks the server to delete every idea; cards disappear as the "removed" events arrive. */
function clearIdeas() {
  return app.service("ideas").remove(null);
}
/**
 * "removed" event handler: removes the matching card, if it is displayed.
 * @param idea The removed idea (only its `id` is used).
 */
function removeIdeaCard(idea: Idea) {
  const card = document.querySelector(`#ideas [data-id="${idea.id}"]`);
  if (card) card.remove();
}
/**
 * Escapes `& < > " '` so a value can be put into innerHTML as plain text. Idea fields are user
 * input, so they must be escaped before rendering (XSS).
 */
function escapeHtml(value: unknown) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
/**
 * Appends one idea card to the list. `idea.id` is a server-generated number, so it needs no
 * escaping. `data-id` on the card and on the delete button links both to the idea.
 * @param idea The idea to show (from `find()` or a "created" event).
 */
function renderIdea(idea: Idea) {
  document.getElementById(
    "ideas"
  )!.innerHTML += `<div class="card idea-card my-3" data-id="${idea.id}">
        <button
          type="button"
          class="delete-idea"
          data-id="${idea.id}"
          aria-label="Delete idea"
        >&times;</button>
        <div class="card-body">
          <p class="lead">
            ${escapeHtml(idea.text)} <strong>(${escapeHtml(idea.tech)})</strong>
            <br />
            <em>Submitted by ${escapeHtml(idea.viewer)}</em>
            <br />
            <small>${escapeHtml(idea.time)}</small>
          </p>
        </div>
      </div>`;
}
/**
 * Loads the existing ideas, then subscribes to live events. Order matters: render what is already
 * there first, then listen for changes. Sets `data-ready` on <body> when done (tests wait for it).
 */
async function init() {
  // Find ideas
  const ideas = await app.service("ideas").find();
  // Add existing ideas to list
  ideas.forEach(renderIdea);
  // Add idea in realtime
  app.service("ideas").on("created", renderIdea);
  // Remove idea in realtime
  app.service("ideas").on("removed", removeIdeaCard);
  // Signal that the initial load is done and realtime listeners are active
  document.body.dataset.ready = "true";
}
init();
