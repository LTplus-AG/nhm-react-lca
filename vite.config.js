import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/kbob': {
        target: 'https://www.lcadata.ch',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  }
})
