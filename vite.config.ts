import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { ProxyOptions } from "vite";

const gitBranch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
const gitCommit = execSync("git rev-parse --short HEAD").toString().trim();

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const hcdpApiToken = env.HCDP_API_TOKEN;
  const hcdpEmail = env.HCDP_EMAIL;

  const hcdpProxy: ProxyOptions = {
    target: "https://api.hcdp.ikewai.org",
    changeOrigin: true,
    rewrite: (reqPath) =>
      reqPath.replace(/^\/ccsvi-dashboard\/api/, ""),
    configure: (proxy) => {
      proxy.on("proxyReq", (proxyReq) => {
        if (hcdpApiToken) {
          proxyReq.setHeader("Authorization", `Bearer ${hcdpApiToken}`);
        } else {
          console.warn(
            "HCDP_API_TOKEN is missing. Add it to public/data/HCDP_API/.env or the project .env (never use VITE_ prefix).",
          );
        }
        if (hcdpEmail) {
          proxyReq.setHeader("User-Agent", hcdpEmail);
        }
      });
    },
  };

  return {
    plugins: [react()],
    base: "/ccsvi-dashboard/",
    define: {
      __GIT_BRANCH__: JSON.stringify(gitBranch),
      __GIT_COMMIT__: JSON.stringify(gitCommit),
    },
    worker: {
      format: "es",
    },
    server: {
      proxy: {
        "/ccsvi-dashboard/api": hcdpProxy,
        "/api": "http://128.171.215.85:8000",
        "/data": "http://128.171.215.85:8000",
      },
    },
    preview: {
      proxy: {
        "/ccsvi-dashboard/api": hcdpProxy,
        "/api": "http://128.171.215.85:8000",
        "/data": "http://128.171.215.85:8000",
      },
    },
  };
});

