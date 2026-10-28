import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves this project from https://<user>.github.io/StudyApp/,
  // so every emitted asset URL must be prefixed with /StudyApp/.
  base: '/StudyApp/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
