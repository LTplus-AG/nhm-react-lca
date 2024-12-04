import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/kbob': {
        target: 'https://www.lcadata.ch/api/kbob/materials',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => '',
        headers: {
          'x-api-key': 'SLST#2y9@&T#R^^pm8tJ%ZZerL5@MSXVZ@UnrtgB'
        }
      }
    }
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  }
})
