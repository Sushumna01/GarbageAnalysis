import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "./",
    server: {
      proxy: {
        "/api": {
          target: env.API_TARGET || "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
  };
});
