import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nixkom.id',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false, // emit --shiki-light/--shiki-dark vars; style.css picks by data-mode
      transformers: [{ pre(node) { node.properties['data-lang'] = this.options.lang; } }],
    },
  },
});
