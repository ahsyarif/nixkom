import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE, getPosts, postUrl, summary } from '../lib/site';

export async function GET(ctx: APIContext) {
  return rss({
    title: SITE.title,
    description: SITE.tagline,
    site: ctx.site!,
    customData: '<language>id</language>',
    items: (await getPosts()).map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: summary(p, 300),
      link: postUrl(p),
      categories: [...p.data.categories, ...p.data.tags],
    })),
  });
}
