import { defineConfig } from 'vite'; // ^4.4.0
import react from '@vitejs/plugin-react'; // ^4.0.0
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // React plugin configuration
  plugins: [react()],

  // Module resolution configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@interfaces': path.resolve(__dirname, './src/interfaces'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },

  // Production build configuration
  build: {
    outDir: 'dist',
    sourcemap: true, // Enable source maps for debugging
    minify: true, // Enable minification for production
    // Target modern browsers as per requirements
    target: ['chrome89', 'firefox89', 'safari14', 'edge89'],
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Group major dependencies into separate chunks
          vendor: ['react', 'react-dom', '@mui/material'],
          redux: ['@reduxjs/toolkit', 'react-redux']
        }
      }
    }
  },

  // Development server configuration
  server: {
    port: 3000,
    strictPort: true, // Fail if port is already in use
    host: true, // Listen on all addresses
    cors: true, // Enable CORS for development
    proxy: {
      // Proxy API requests to backend during development
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },

  // Preview server configuration (for production build testing)
  preview: {
    port: 3000,
    strictPort: true,
    host: true
  }
});