# Astro Starter Kit: Blog

## WordPress migration

Migration is phase-gated. See the [approved plan](.github/plan.md) and
[phase-one inventory and proposed contract](.github/migration-phase-one.md).
Phase one inventories local inputs only; it does not import content or assets.

With Node 24 and dependencies installed:

```sh
npm run migration:inventory
npm run test:migration
npm run migration:inventory -- --check
```

The inventory requires one WXR 1.2 XML file directly in the gitignored
`_migration/` folder, plus `_migration/blog/wp-content/uploads/YYYY/MM/`.
It writes only `_migration/inventory/inventory.json` and
`_migration/inventory/expected-output.json`. Do not commit, upload, or publish
these files or use the source folder in GitHub Actions.

The normal command exits 0 when evidence was generated, **not** when the phase
is accepted. `--check` exits 1 while discrepancies or owner approvals remain.
Malformed/missing inputs and unsafe filesystem inputs also exit nonzero.
Review the local findings and the contract before approving another phase.

### Static blog foundation (phase 2)

The site now builds statically for `https://blog.pieeatingninjas.be`, with
directory-style pages and trailing slashes. Development uses Node 24 and port
4321 on all interfaces, matching the dev container. No adapter or backend is
required.

Posts imported later can supply this frontmatter in addition to the template's
title, description, and publication date:

```yaml
pubDate: '2020-02-29'
legacy:
  id: 123
  path: /2020/02/29/original-slug/
categories: [dotnet]
tags: [example]
```

The exact legacy path determines the route and canonical URL, not the content
filename or the machine's timezone. The same WordPress ID will link the post
to its future static comment archive. IDs and paths must be unique across posts
and selected pages. Categories and tags remain separate. Starter posts without
legacy metadata retain their `/blog/{id}/` URLs.

About, Book, Privacy Policy, and the actual 404 page have independent routes.
About still contains template copy; Book and Privacy Policy explicitly show
pending-content placeholders. No private About content or final legal copy has
been published. The old 404 content slug redirects to `/404.html`.
Template styling is unchanged.

The blog overview is the home page at `/`; there is no separate welcome page.
`/blog/` redirects to `/`, while starter article URLs under `/blog/{id}/`
remain available. Navigation links directly to the root overview.

```sh
npm run test:routing
npm run astro -- check
npm run build
npm run dev -- --background
# When finished:
npm run astro -- dev stop
```

Routing tests build synthetic dated posts in a temporary project and remove it
afterwards. They verify the actual HTML, canonical URLs, dates, feed/archive
links, sitemap coverage, and rejection of duplicate IDs. Test articles are never
added to the real site's content. The local WordPress dump is excluded from
TypeScript/Astro checking.

```sh
npm create astro@latest -- --template blog
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and Open Graph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
