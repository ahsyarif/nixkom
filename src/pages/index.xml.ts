import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE, getPosts, postUrl } from '../lib/site';

export async function GET(ctx: APIContext) {
  return rss({
    title: SITE.title,
    description: SITE.tagline,
    site: ctx.site!,
    items: (await getPosts()).map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.description,
      link: postUrl(p),
      categories: [...p.data.categories, ...p.data.tags],
    })),
  });
}
