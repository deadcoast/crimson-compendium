import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base './' keeps every asset path relative, so the build runs from any static host or sub-path.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
});
