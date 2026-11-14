import { getCollection, type CollectionEntry } from 'astro:content';

export const SITE = {
  title: 'nixkom.id',
  tagline: 'Catatan sistem, Linux/Nix, dan jaringan',
  description: 'Panduan praktis berbahasa Indonesia tentang server Linux, Debian, NixOS, Docker, Git, Tailscale, dan jaringan, dari pemula sampai admin server.',
  author: 'Ahmad',
  github: 'https://github.com/nixkom',
  pageSize: 10,
};

export const MENU = [
  { id: 'home', name: 'BERANDA', url: '/' },
  { id: 'categories', name: 'KATEGORI', url: '/categories/' },
  { id: 'tags', name: 'TAG', url: '/tags/' },
  { id: 'archives', name: 'ARSIP', url: '/archives/' },
  { id: 'about', name: 'TENTANG', url: '/about/' },
];

export type Post = CollectionEntry<'posts'>;

/** Newest first. */
export async function getPosts(): Promise<Post[]> {
  return (await getCollection('posts')).sort((a, b) => +b.data.date - +a.data.date);
}

/** Hugo `urlize`: lowercase, spaces to dashes. */
export const slug = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-');

export const postUrl = (p: Post) => `/posts/${p.id}/`;

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
export const isoDate = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });

const words = (body = '') => body.split(/\s+/).filter(Boolean).length;
export const wordCount = (p: Post) => words(p.body);
export const readingTime = (p: Post) => Math.max(1, Math.ceil(words(p.body) / 212));

export const summary = (p: Post, n: number) => {
  const t = p.data.description ?? (p.body ?? '').replace(/^\s*(?:[-+]\s+|-{3,}\s*$)/gm, '').replace(/[#`*>_\[\]]/g, '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
};

/** Terms of a taxonomy with their posts, alphabetical. */
export function terms(posts: Post[], key: 'tags' | 'categories') {
  const m = new Map<string, { slug: string; name: string; posts: Post[] }>();
  for (const p of posts)
    for (const name of p.data[key]) {
      const s = slug(name);
      (m.get(s) ?? m.set(s, { slug: s, name, posts: [] }).get(s)!).posts.push(p);
    }
  return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
}
