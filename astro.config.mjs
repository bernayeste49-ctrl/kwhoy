import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://kwhoy.es',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !/\/precio-luz\/\d{4}-\d{2}-\d{2}\/$/.test(page) })],
});
