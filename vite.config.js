import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Kun i development proxy'er vi /api-football til API-Football upstream
  // med API-nøglen fra .env (VITE_API_FOOTBALL_KEY).
  const proxy =
    mode === "development"
      ? {
          "/api-football": {
            target: "https://v3.football.api-sports.io",
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/api-football/, ""),
            headers: {
              "x-apisports-key":
                env.VITE_API_FOOTBALL_KEY || env.API_FOOTBALL_KEY || "",
            },
          },
        }
      : undefined;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy,
    },
    css: { postcss: "./postcss.config.cjs" },
    resolve: { alias: { "@": "/src" } },
  };
});
