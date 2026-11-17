import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://kwhoy.es',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
