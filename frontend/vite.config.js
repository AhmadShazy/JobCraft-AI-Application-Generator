import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Pin the dev port. Everything else (README, .env FRONTEND_URL, the backend's
    // local CORS origins, dev-tools/launcher.py) hardcodes 5173, and Vite would
    // otherwise silently move to 5174 when the port is taken, breaking CORS and
    // the verification/reset links. strictPort makes that fail loudly instead.
    port: 5173,
    strictPort: true,
  },
})
