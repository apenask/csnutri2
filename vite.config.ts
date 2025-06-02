import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // Habilita o suporte ao React, incluindo Fast Refresh (HMR)
  optimizeDeps: {
    exclude: ['lucide-react'], // Instrui o Vite a não pré-empacotar 'lucide-react'
  },
});