import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.js"],
    // CI: compact dot output. Locally: the default reporters plus an HTML report (.vitest/index.html)
    reporters: process.env.CI ? ["dot"] : [...configDefaults.reporters, "html"]
  }
});
