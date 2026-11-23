// Socket.io setup
const socket = io("http://localhost:3030");
// Init feathers app
const app = feathers();
// Register socket.io to talk to server
app.configure(feathers.socketio(socket));
document.getElementById("form").addEventListener("submit", sendIdea);
document.getElementById("clear").addEventListener("click", clearIdeas);
// Delegated: cards are re-created whenever a new idea is rendered
document.getElementById("ideas").addEventListener("click", e => {
  const button = e.target.closest(".delete-idea");
  if (button) deleteIdea(button.dataset.id);
});
async function sendIdea(e) {
  e.preventDefault();
  const text = document.getElementById("idea-text");
  const tech = document.getElementById("idea-tech");
  const viewer = document.getElementById("idea-viewer");
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
function deleteIdea(id) {
  // The card is removed when the server's "removed" event arrives
  return app.service("ideas").remove(Number(id));
}
function clearIdeas() {
  return app.service("ideas").remove(null);
}
function removeIdeaCard(idea) {
  const card = document.querySelector(`#ideas [data-id="${idea.id}"]`);
  if (card) card.remove();
}
function renderIdea(idea) {
  document.getElementById(
    "ideas"
  ).innerHTML += `<div class="card idea-card my-3" data-id="${idea.id}">
        <button
          type="button"
          class="delete-idea"
          data-id="${idea.id}"
          aria-label="Delete idea"
        >&times;</button>
        <div class="card-body">
          <p class="lead">
            ${idea.text} <strong>(${idea.tech})</strong>
            <br />
            <em>Submitted by ${idea.viewer}</em>
            <br />
            <small>${idea.time}</small>
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
}
init();
