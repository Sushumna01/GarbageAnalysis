import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "./",
    server: {
      proxy: {
        "/api/ml": {
          target: env.ML_API_TARGET || "http://127.0.0.1:8000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ml/, ""),
        },
        "/api": {
          target: env.API_TARGET || "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
  };
});
