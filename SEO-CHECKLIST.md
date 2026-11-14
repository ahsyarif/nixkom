# SEO checklist

Follow-up items after the on-page SEO work (canonical URLs, Open Graph/Twitter tags, JSON-LD, `lang="id"`, unique titles and descriptions, 404 page, favicon).

## Not done yet

- [ ] **Social share image.** No `og:image` is set, so links shared on WhatsApp, X, or LinkedIn show text only. Options: one default 1200×630 PNG for every page, or per-post images generated at build time.
- [ ] **Sitemap `lastmod`.** `@astrojs/sitemap` does not record when each page last changed. Can be added with the integration's `serialize` option using each post's date.

## After deploying

- [ ] **Google Search Console.** Add the `nixkom.id` property, verify ownership (DNS TXT record in Cloudflare is easiest), then submit `https://nixkom.id/sitemap-index.xml`.
- [ ] **Redirect `www` to the apex domain.** If `www.nixkom.id` is used, redirect it to `https://nixkom.id` in Cloudflare (Rules → Redirect Rules) so the two hostnames don't compete in search results.
- [ ] **Rich Results Test.** Paste one post URL into <https://search.google.com/test/rich-results> and confirm the `BlogPosting` and `BreadcrumbList` data are detected without errors.
