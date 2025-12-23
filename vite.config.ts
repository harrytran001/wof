import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages needs a non-root base path like "/<repo-name>/"
// We inject BASE_PATH in the GitHub Actions workflow.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  plugins: [react()],
  base,
});


