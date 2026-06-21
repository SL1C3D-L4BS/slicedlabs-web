import {defineConfig} from 'vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import {reactRouter} from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [hydrogen(), oxygen(), reactRouter(), tailwindcss()],
  resolve: {
    // Vite 8 resolves the `~/*` -> `app/*` alias from tsconfig.json natively.
    tsconfigPaths: true,
    // Dedupe React so the Oxygen worker loads ONE copy — the @slicedlabs/ui hooks
    // (useTemp/useEffect) throw "Invalid hook call" against a second React instance.
    dedupe: ['react', 'react-dom'],
  },
  build: {
    // Allow a strict Content-Security-Policy without inlining assets as base64.
    assetsInlineLimit: 0,
  },
  ssr: {
    // The shared workspace packages ship raw TS/TSX + CSS (no build step), so
    // they must be transformed by Vite for the Oxygen/worker SSR bundle rather
    // than treated as pre-built externals.
    noExternal: ['@slicedlabs/ui', '@slicedlabs/tokens', '@slicedlabs/brand'],
    optimizeDeps: {
      /**
       * Include dependencies here if they throw CJS<>ESM errors at runtime,
       * e.g. `ReferenceError: module is not defined`.
       * @see https://vitejs.dev/config/dep-optimization-options
       */
      include: [
        'react-router > set-cookie-parser',
        'react-router > cookie',
        'react-router',
      ],
    },
  },
  server: {
    allowedHosts: ['.tryhydrogen.dev', '.slicedlabs.io'],
  },
});
