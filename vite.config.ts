import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Removed external configuration to ensure all dependencies are bundled
    // and available in the deployed application.
  }
});