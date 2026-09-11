import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// Separate opt-in build; normal production build excludes the benchmark entry.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    outDir: 'build-benchmark',
    sourcemap: true,
    copyPublicDir: false,
    rollupOptions: { input: 'virtualization-benchmark.html' },
  },
});
