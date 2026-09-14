import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Static output. React components render to HTML at build time and ship no
// JavaScript unless a component is given a client:* directive.
export default defineConfig({
  site: 'https://sferaonchain.xyz',
  integrations: [react()],

  build: {
    // Inline the stylesheet rather than emitting /_astro/*.css.
    // Two small pages: one fewer round trip on first paint, and the built
    // HTML stays self-contained so it renders correctly anywhere it is
    // opened, not only when served from the site root.
    inlineStylesheets: 'always',
  },
});
