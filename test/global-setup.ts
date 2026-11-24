import { execFileSync } from "node:child_process";

// public/render_submit.js is a build artifact; make sure it exists and is current
export default function setup() {
  execFileSync("npx", ["tsc", "-p", "tsconfig.client.json"], { stdio: "inherit" });
}
