import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'socket.io-client',
        'firebase/app',
        'firebase/database',
        'lucide-react',
        'd3',
        'recharts'
      ]
    }
  }
});