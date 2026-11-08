# nixkom

Source for [nixkom.id](https://nixkom.id), a static engineering blog covering Linux, NixOS, systems programming, and networking. Built with [Astro](https://astro.build) 7 and a hand-written theme based on the Chirpy style.

## Features

- Markdown posts with categories, tags, descriptions, and pinning
- Paginated post list, archives, and category and tag pages
- Client-side search over a generated `/index.json`
- RSS feed at `/index.xml` and sitemap via `@astrojs/sitemap`
- Dark and light themes, with syntax highlighting (Shiki) and copy buttons on code blocks

## Requirements

- Node.js 22.23.4 or newer. Astro 7 refuses to build on older versions. This repo was tested with Node 26.13.0.
- npm (ships with Node)

## Getting started

```bash
npm ci
npm run dev
```

Open http://localhost:4321.

## Commands

| Command | What it does |
| --- | --- |
| `npm ci` | Installs dependencies from `package-lock.json` |
| `npm run dev` | Starts the dev server with live reload |
| `npm run build` | Writes the static site to `dist/` |
| `npm run preview` | Serves the `dist/` build locally to check it before deploying |

## Project layout

```
src/
  content/posts/     Markdown posts
  content.config.ts  Post schema (frontmatter validation)
  lib/site.ts        Site settings, menu, and shared helpers
  layouts/           Base page shell and markdown page layout
  components/        Post list and icon components
  pages/             Routes: home, posts, categories, tags, archives, feeds
  scripts/client.ts  Theme toggle, search, code copy buttons, TOC scrollspy
public/              Static files: style.css, robots.txt
astro.config.mjs     Site URL, sitemap, and Shiki configuration
```

## Writing a post

Create `src/content/posts/<slug>.md`. The filename becomes the URL: `/posts/<slug>/`.

```markdown
---
title: "My Post Title"
date: 2026-11-08T10:00:00+07:00
categories: ["Systems"]
tags: ["linux", "networking"]
description: "Optional one-line summary shown in lists and feeds."
pin: false
---

Post body in Markdown.
```

- `title` and `date` are required. `categories`, `tags`, and `pin` are optional.
- Don't name a file with only digits, such as `2.md`. The build stops, because that URL would clash with the pagination routes.
- Without `description`, the list summary is generated from the first part of the body.

## Deploying

The site is fully static, so any static host works. For Cloudflare Pages:

- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION` = `26.13.0` (or any version 22.23.4 or newer)

Set `site` in `astro.config.mjs` to the public domain so the sitemap, feeds, and canonical links use the right URLs.

## License

Post content is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), as stated on each post. The site code is not yet licensed; add a `LICENSE` file if you want to set terms.
