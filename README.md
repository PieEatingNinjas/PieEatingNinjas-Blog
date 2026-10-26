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
