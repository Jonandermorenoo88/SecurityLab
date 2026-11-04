// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Cambia `site` por tu dominio real cuando publiques el blog
// (por ejemplo https://securitylab.netlify.app). Lo usan el sitemap y el RSS.
export default defineConfig({
  site: 'https://securitylab.example.com',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: true,
    },
  },
});
