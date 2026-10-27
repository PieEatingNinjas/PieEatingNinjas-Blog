# PieEatingNinjas Blog

The source behind [blog.pieeatingninjas.be](https://blog.pieeatingninjas.be),
Pieter Nijs's personal blog about .NET, .NET MAUI, Azure, and related development
topics.

Originally hosted on WordPress, the blog has been migrated to **Astro**, with
**[giscus](https://giscus.app/)** for new comments through GitHub Discussions.
Articles, media, and historical WordPress comments are now checked-in content;
WordPress is no longer needed to build or serve the site.

This repository documents how my own blog is built and maintained. It is
published as a reference for developers exploring Astro, giscus, or a move
from WordPress to a static site. It is a working personal site rather than a
general-purpose blog theme or starter template: the content, branding,
integrations, and compatibility routes are specific to this blog.

## How it works

- **Static Astro site:** pages are generated at build time and hosted on GitHub
  Pages, without SSR, a database, or a runtime backend.
- **Markdown and MDX articles:** Astro content collections validate article
  metadata and generate the dated post routes.
- **WordPress compatibility:** migrated posts retain their
  `/YYYY/MM/DD/slug/` URLs, with trailing slashes. Archive and taxonomy routes,
  legacy aliases, query-ID redirects, feeds, and historical upload URLs are
  retained through reviewed metadata and static mappings.
- **Comments:** historical WordPress comments are rendered as static,
  sanitized archives. New comments use giscus with
  [Discussions in this repository](https://github.com/PieEatingNinjas/PieEatingNinjas-Blog/discussions).
- **Local search:** browser-only search covers all posts by title,
  description, category, and tag, without an external search service. The
  normal paginated archive remains available without JavaScript.
- **Consent-gated analytics:** analytics only runs on the production origin
  after consent, not during local development or on other origins.

## Development

Use the included VS Code dev container, which provides **Node.js 24** and
**npm**, or install that Node.js version locally.

```sh
npm ci
npm run dev
```

Open `http://localhost:4321`. The development server binds to all interfaces,
and the dev container forwards port 4321.

To build the site:

```sh
npm run build
```

`npm run build` writes the static site to `dist/`. `npm run preview` serves
that production build locally.

### Optional local validation

The repository includes focused regression tests for site-specific behavior.
These are maintainer checks, not steps required to start the blog:

| Command | What it checks |
| --- | --- |
| `npm run astro -- check` | Astro diagnostics and TypeScript checks |
| `npm run test:routing` | Legacy URLs, dates, metadata, and generated routes, canonical links, archives, and feeds, including a temporary fixture build |
| `npm run test:giscus` | Configuration validation, disabling the embed, and custom theme URL handling |
| `npm run test:search` | Search matching, clearing, keyboard behavior, and restoring the archive |
| `node --experimental-strip-types --test scripts/analytics.test.mjs` | Analytics consent, production-origin restrictions, and consent storage behavior |

To run all of these checks locally:

```sh
npm run astro -- check
npm run test:routing
npm run test:giscus
npm run test:search
node --experimental-strip-types --test scripts/analytics.test.mjs
```

**These checks are not currently enforced by the GitHub Pages workflow.**
That workflow builds and deploys the site; a successful build does not mean
the regression tests or `astro check` have run.

### giscus configuration

giscus is enabled by default. To explore the site without loading the external
comment embed, create a local `.env` file before starting development or
building:

```dotenv
PUBLIC_GISCUS_ENABLED=false
```

When disabled, no giscus script is loaded. To enable it again, remove the
override or set it to `true`, then restart development or rebuild.

The public repository and category identifiers live in
[`src/lib/giscus.ts`](src/lib/giscus.ts). They are not credentials. The embed
maps discussions by page pathname, so keeping article URLs stable also keeps
their discussion mapping stable.

## Deployment

The [GitHub Pages workflow](.github/workflows/deploy.yml) builds and deploys
on pushes to `main` and can also be started manually. It uses Node.js 24 and
npm.

The production origin is `https://blog.pieeatingninjas.be`, at the domain root.
The Astro site configuration, canonical URLs, sitemap, feeds, and
[`public/CNAME`](public/CNAME) are configured for that address, not a
repository-path deployment.

If you adapt the implementation for your own site, replace the domain,
branding, analytics configuration, and giscus repository/category identifiers.
Do not point your comments or deployment at this blog's services.

## Repository map

| Path | Purpose |
| --- | --- |
| [`src/content/blog/`](src/content/blog/) | Blog articles in Markdown and MDX |
| [`src/data/`](src/data/) | Published legacy metadata, static URL mappings, and historical comment archives |
| [`src/pages/`](src/pages/) | Pages, article routes, archives, feeds, and compatibility endpoints |
| [`src/components/`](src/components/) and [`src/layouts/`](src/layouts/) | Shared Astro components and page layouts |
| [`src/lib/`](src/lib/) | Routing, content, search, comments, and integration helpers |
| [`src/styles/`](src/styles/) | Shared site styling |
| [`public/`](public/) | Static assets, including historical images under `wp-content/uploads/YYYY/MM/` |
| [`scripts/`](scripts/) | Focused checks for routing, search, giscus, and analytics |

## Migration and privacy

The repository contains the migrated site, not a WordPress import tool.
Private WordPress exports and migration working files are intentionally
excluded. The site can be built from the checked-in content without those
source files.

Historical comment markup is treated as untrusted and rendered with explicit
HTML and URL allowlists. Source email addresses, IP addresses, and unrelated
personal metadata are not part of the published comment model.

Keep local environment files and private migration inputs out of version
control. Never place raw WordPress exports in content, fixtures, or public
assets.

## License and content

The original site code is available under the [MIT License](LICENSE).

That license does **not** cover blog articles, historical comments, images,
fonts, logos, or other editorial and third-party material, including the
content in `src/content/`, `src/data/`, `src/assets/`, and `public/`. Those
materials remain with their respective rights holders; their presence here
does not grant permission to republish them. Third-party software retains its
own license.
