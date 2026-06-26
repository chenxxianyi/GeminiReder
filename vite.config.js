import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 4310,
    strictPort: true
  },
  preview: {
    port: 4311,
    strictPort: true
  },
  define: {
    // Polyfill global for epubjs
    'global': 'window',
  },
  resolve: {
    alias: {
      // Polyfill buffer/process if needed, though usually just global is enough for epubjs basic usage
    }
  }
})
