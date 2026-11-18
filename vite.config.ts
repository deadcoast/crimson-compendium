import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The build ships as one classic deferred script instead of an ES module, so dist/index.html
// opens straight from disk (file://), not only from a server. base './' keeps every path relative.
const classicScript: Plugin = {
  name: 'classic-script',
  enforce: 'post',
  transformIndexHtml: (html) =>
    html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, '<script defer src="$1"></script>'),
};

export default defineConfig({
  base: './',
  plugins: [svelte(), classicScript],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
    modulePreload: false,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
});
