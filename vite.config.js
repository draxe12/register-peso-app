import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  base: '/register-peso-app/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'pwa-64x64.png', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-icon-512x512.png'], // Ajusta tus iconos
      manifest: {
        name: 'Registro de Pesos de Pollos',
        short_name: 'Registro de Pesos',
        description: 'Registro de Pesos de Pollos para obtener promedio y uniformidad',
        background_color: '#1f2938', // Color de fondo para la splash screen
        theme_color: '#1f2938',      // Color para la barra de título/dirección
        lang: 'es',
        icons: [
          {
            "src": "/register-peso-app/pwa-64x64.png",
            "sizes": "64x64",
            "type": "image/png"
          },
          {
            "src": "/register-peso-app/pwa-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
          },
          {
            "src": "/register-peso-app/pwa-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
          },
          {
            "src": "/register-peso-app/maskable-icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
          }
        ]
      }
    })
  ],
})
