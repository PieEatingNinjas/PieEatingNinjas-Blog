# PieEatingNinjas Blog

A static Astro site for Pieter Nijs's .NET, MAUI, and Azure articles. Article
content and media are maintained directly in this repository.

## Development

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

The development server listens on port 4321. To validate changes:

```sh
npm run astro -- check
npm run test:routing
npm run test:giscus
npm run test:search
npm run test:pages-base
npm run build
```

`npm run preview` serves the most recent production build locally.

## Site

The production origin is `https://blog.pieeatingninjas.be`. The site is
pre-rendered for GitHub Pages and keeps the dated article URLs, archive and
taxonomy routes, legacy aliases, RSS compatibility feed, and static comment
archives. Giscus discussions and consent-gated analytics are implemented as
optional site integrations.

The landing page includes an always-visible, compact browser-only search
field with a "Search all posts" placeholder and a subtle focus border.
The Clear button only appears when there is text; its space stays reserved,
including on mobile, so the input does not change width.
Pressing Escape clears the query and restores the archive.
Search covers all posts, including older archive pages.
It matches titles, descriptions, categories and tags,
ignoring case and accents and requiring every search term to match. Search
data is generated as static HTML at build time; no backend, external search
service, tracking or additional dependencies are used. Clearing the query
restores the original cards and pagination. Without JavaScript, the normal
archive remains available.

The GitHub Pages workflow in `.github/workflows/deploy.yml` is manually
triggered. Its build uses a repository-path preview base; production URLs and
canonical links remain rooted at the custom domain.

## Project structure

- `src/content/blog/` contains the articles.
- `src/data/` contains content metadata and static legacy-site mappings used by
  archive, redirect, query-ID, and image-alias routes.
- `src/pages/`, `src/components/`, and `src/layouts/` contain the Astro site.
- `public/` contains static assets, including the retained upload URLs.
- `scripts/` contains focused checks for site behavior and deployment output.
