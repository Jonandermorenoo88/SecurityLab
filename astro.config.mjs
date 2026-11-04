// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Publicado en GitHub Pages: https://jonandermorenoo88.github.io/SecurityLab/
// Si algún día usas un dominio propio, pon aquí ese dominio en `site` y quita `base`.
// Las imágenes de los .md llevan esta ruta delante: ![captura](/SecurityLab/images/...)
const BASE = '/SecurityLab';

export default defineConfig({
  site: 'https://jonandermorenoo88.github.io',
  base: BASE,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: true,
    },
  },
});
