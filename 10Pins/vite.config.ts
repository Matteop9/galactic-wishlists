import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Port 3000 matches Supabase's default Site URL, so magic links redirect correctly in dev
  server: { port: 3000 },
});
