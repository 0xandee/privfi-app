import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Only apply CORS headers when needed for WASM, not for all requests
    middlewares: [
      (req, res, next) => {
        // Only apply strict CORS headers for WASM-related requests
        if (req.url?.includes('.wasm') || req.url?.includes('.zkey') || req.url?.includes('typhoon')) {
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        }
        next();
      }
    ],
  },
  plugins: [
    react(),
    nodePolyfills({
      // To add only specific polyfills, add them here
      include: ['buffer', 'process', 'util', 'crypto'],
      // Whether to polyfill `node:` protocol imports
      protocolImports: true,
    }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['typhoon-sdk'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
  },
  assetsInclude: ['**/*.wasm', '**/*.zkey'],
}));
