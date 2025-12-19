import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'

const packageJson = JSON.parse(fs.readFileSync('./package.json'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version)
  },
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
