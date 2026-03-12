import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://api.deepcard.ch',
        changeOrigin: true,
        secure: false, // permet les certs auto-signés (proxy d'entreprise)
      },
    },
  },
})