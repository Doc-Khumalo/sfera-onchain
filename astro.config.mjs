import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Static output. React components render to HTML at build time and ship no
// JavaScript unless a component is given a client:* directive.
export default defineConfig({
  site: 'https://sferaonchain.xyz',
  integrations: [react()],
});
