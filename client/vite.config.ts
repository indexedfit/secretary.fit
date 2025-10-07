import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const certPath = '.cert/cert.pem'
const keyPath = '.cert/key.pem'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // Listen on all addresses (0.0.0.0)
    port: 5173,
    https: fs.existsSync(certPath) && fs.existsSync(keyPath) ? {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    } : false, // Use HTTPS if cert exists, otherwise HTTP
    proxy: {
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
})
