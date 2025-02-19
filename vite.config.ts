import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on the current mode.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      federation({
        name: "lca-ui",
        filename: "remoteEntry.js",
        exposes: {
          "./App": "./src/App.tsx",
        },
        shared: ["react", "react-dom", "react-router-dom"],
      }),
    ],
    server: {
      proxy: {
        "/backend/kbob": {
          target: "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
        },
      },
    },
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx"],
    },
    build: {
      target: "esnext",
      minify: false,
    },
  };
});
