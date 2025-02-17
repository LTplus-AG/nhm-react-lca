import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on the current mode.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      federation({
        name: 'lca-ui',
        exposes: {
          './App': './src/App.tsx',
        },
        shared: ['react', 'react-dom', 'react-router-dom'],
      }),
    ],
    server: {
      proxy: {
        '/api/kbob': {
          target: 'https://www.lcadata.ch',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/kbob/, '/api/kbob/materials'),
          headers: {
            'x-api-key': env.IFC_API_KEY,
          },
        },
      },
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    build: {
      target: 'esnext',
      minify: false,
    },
  }
})