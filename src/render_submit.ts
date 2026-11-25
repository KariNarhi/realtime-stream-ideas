interface Idea {
  id: number;
  text: string;
  tech: string;
  viewer: string;
  time: string;
}

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
async function sendIdea(e: Event) {
  e.preventDefault();
  const text = document.getElementById("idea-text") as HTMLInputElement;
  const tech = document.getElementById("idea-tech") as HTMLInputElement;
  const viewer = document.getElementById("idea-viewer") as HTMLInputElement;
  // Create new idea
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
function deleteIdea(id: string) {
  // The card is removed when the server's "removed" event arrives
  return app.service("ideas").remove(Number(id));
}
function clearIdeas() {
  return app.service("ideas").remove(null);
}
function removeIdeaCard(idea: Idea) {
  const card = document.querySelector(`#ideas [data-id="${idea.id}"]`);
  if (card) card.remove();
}
function escapeHtml(value: unknown) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
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
