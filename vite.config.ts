import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  server: {
    host: true, // Bind to 0.0.0.0 for phone/mobile access over Wi-Fi
    port: 5173,
    watch: {
      ignored: ['**/.chrome-test-profile/**', '**/firestore-debug.log', '**/firebase-debug.log']
    }
  },


  preview: {
    host: true,
    port: 4173
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        importScripts: ['/sw-push.js']
      },
      manifest: {
        name: 'Loady - Philippine Prepaid Companion',
        short_name: 'Loady',
        description: 'Prepaid load burn-rate forecaster, consumption pacing, and promo recommendations for Globe, Smart, DITO, TM, TNT, and GOMO.',
        theme_color: '#10131c',
        background_color: '#10131c',
        display: 'standalone',
        orientation: 'portrait',
        share_target: {
          action: '/?share-target=true',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text'
          }
        }
      }
    })
  ],
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  }
});

