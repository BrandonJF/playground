import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@spice': resolve(__dirname, './src/spice'),
      '@utils': resolve(__dirname, './src/utils')
    }
  },
  server: {
    open: true, // Automatically open browser on dev start
    watch: {
      usePolling: true, // Helps with some file systems
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})