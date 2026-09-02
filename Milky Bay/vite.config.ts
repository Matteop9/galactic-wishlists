import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        /* Vendor changes about never, so splitting it out means a weekly release
           only invalidates the small app chunk. Deliberately NOT splitting per
           route: a chunk fetch per tab would add exactly the blank frame this
           release exists to remove. */
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            'react-router-dom',
            '@supabase/supabase-js',
            '@tanstack/react-query',
          ],
        },
      },
    },
  },
})
