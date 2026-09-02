import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        /* ~90% of the bundle is vendor and it changes about never — splitting it
           out means a weekly release only invalidates the small app chunk.
           Deliberately NOT splitting per route: the pages are tiny next to this,
           and a chunk fetch per tab would add exactly the blank frame v0.10.0
           exists to remove. */
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
