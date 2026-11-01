import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The browser calls the relative /api path. Locally Vite proxies it to the
// backend; in Kubernetes the Gateway does the routing.
const proxy = {
  '/api': {
    target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy, allowedHosts: true },
})
