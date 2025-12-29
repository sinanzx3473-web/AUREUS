import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import componentTagger from './plugins/component-tagger';

export default defineConfig({
  plugins: [
    react(),
    componentTagger({
      // Exclude R3F components to prevent console errors
      exclude: [
        '**/components/hero/LiquidGoldArtifact.tsx',
        '**/components/HeroArtifact.tsx',
        '**/components/VoidBackground.tsx',
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['posthog-js'],
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Removes all console.log
        drop_debugger: true, // Removes debugger statements
      },
    },
    rollupOptions: {
      onwarn(warning, warn) {
        // Silence "eval" warning from protobufjs or similar libs
        if (warning.code === 'EVAL') return;
        warn(warning);
      },
    },
  },
  esbuild: {
    // Drop console in dev mode too if you want total silence (optional)
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  server: {
    hmr: {
      overlay: false,
      timeout: 15000,
    },
    watch: {
      // Use polling instead of native file system events (more reliable for some environments)
      usePolling: true,
      // Wait 500ms before triggering a rebuild (gives time for all files to be flushed)
      interval: 500,
      // Additional delay between file change detection and reload
      binaryInterval: 500,
    },
  },
});
