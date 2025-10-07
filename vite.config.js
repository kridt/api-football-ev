import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api-football": {
          target: "https://v3.football.api-sports.io",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-football/, ""),
          headers: { "x-apisports-key": env.VITE_API_FOOTBALL_KEY },
        },
      },
    },
    css: { postcss: "./postcss.config.cjs" },
  };
});
