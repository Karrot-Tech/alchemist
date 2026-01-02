import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/transcribe': 'http://localhost:3000',
      '/validate': 'http://localhost:3000',
      '/assess-soap': 'http://localhost:3000',
      '/generate-document': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
    }
  }
})
