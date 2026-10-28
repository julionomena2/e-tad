
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    server: {
      // Autoriser le domaine temporaire Cloudflare
      allowedHosts: [
        'bye-transportation-orlando-timber.trycloudflare.com',
        
      ],

      proxy: {
        // Transmettre les requêtes API à Laravel
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:8000',
          changeOrigin: true,
        },

        // Transmettre les requêtes des images à Laravel
        '/storage': {
          target: env.VITE_BACKEND_URL || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
