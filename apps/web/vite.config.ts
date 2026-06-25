import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { themeTokensPlugin } from './vite/plugin-theme.js';

// https://vite.dev/config/
// tailwindcss() MUST be listed or utility classes won't be generated (silent failure).
// themeTokensPlugin() generates src/.generated/theme.css from src/tokens.ts on dev
// server start + tokens.ts change. Single source of truth: tokens.ts.
// See react-development/references/tailwind-v4-vite-setup.md
export default defineConfig({
  plugins: [themeTokensPlugin(), tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
