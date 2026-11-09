import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The VM whose nginx answers the dev server's data requests: ccsvi-test. The beta is http://128.171.215.85
const DATA_SERVER = "http://128.171.215.61";

// CI has no branch checked out, so git would report "HEAD".
const gitBranch =
  process.env.GITHUB_REF_NAME ?? execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
const gitCommit = execSync("git rev-parse --short HEAD").toString().trim();

// The site's routes: the API (raster and basemap tiles included) and the map files.
// The VM adds the HCDP and basemap keys
const proxy = {
  "/api": DATA_SERVER,
  "/data": DATA_SERVER,
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/ccsvi-dashboard/",
  define: {
    __GIT_BRANCH__: JSON.stringify(gitBranch),
    __GIT_COMMIT__: JSON.stringify(gitCommit),
  },
  worker: {
    format: "es",
  },
  server: { proxy },
  preview: { proxy },
});
