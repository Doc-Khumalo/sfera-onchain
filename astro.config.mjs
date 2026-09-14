import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';

// Static output. React components render to HTML at build time and ship no
// JavaScript unless a component is given a client:* directive.
export default defineConfig({
  site: 'https://sferaonchain.xyz',
  integrations: [react()],

  /* Tailwind powers the component layer on /demo only. The homepage keeps its
     own stylesheet and still ships zero JavaScript. */
  vite: {
    plugins: [tailwind()],
    /* The @/ alias shadcn's generated components import through. */
    resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  },

  build: {
    // Inline the stylesheet rather than emitting /_astro/*.css.
    // Two small pages: one fewer round trip on first paint, and the built
    // HTML stays self-contained so it renders correctly anywhere it is
    // opened, not only when served from the site root.
    inlineStylesheets: 'always',
  },
});
