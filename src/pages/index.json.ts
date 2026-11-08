import { getPosts, postUrl, fmtDate, summary } from '../lib/site';

export async function GET() {
  const posts = await getPosts();
  return Response.json(posts.map((p) => ({
    title: p.data.title,
    permalink: postUrl(p),
    date: fmtDate(p.data.date),
    summary: summary(p, 140),
    tags: p.data.tags,
    categories: p.data.categories,
  })));
}
