import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { ProxyOptions } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const hcdpEnvDir = path.resolve(projectRoot, "public/data/HCDP_API");

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, projectRoot, "");
  const hcdpEnv = loadEnv(mode, hcdpEnvDir, "");
  const hcdpApiToken = hcdpEnv.HCDP_API_TOKEN || rootEnv.HCDP_API_TOKEN;
  const hcdpEmail = hcdpEnv.HCDP_EMAIL || rootEnv.HCDP_EMAIL;

  const hcdpProxy: ProxyOptions = {
    target: "https://api.hcdp.ikewai.org",
    changeOrigin: true,
    rewrite: (reqPath) =>
      reqPath.replace(/^\/ccsvi-dashboard\/api/, "").replace(/^\/api/, ""),
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
    server: {
      proxy: {
        "/ccsvi-dashboard/api": hcdpProxy,
        "/api": hcdpProxy,
      },
    },
    preview: {
      proxy: {
        "/ccsvi-dashboard/api": hcdpProxy,
        "/api": hcdpProxy,
      },
    },
  };
});
