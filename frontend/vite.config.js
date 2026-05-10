import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward all ADK API calls (/apps, /run, /feedback) to the backend on port 8000
      '/apps': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/run': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/feedback': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
