# Project rules

## Purpose and workflow

- This is a personal .NET, MAUI, and Azure tech blog migrating from WordPress to Astro. Keep the official blog template's styling; redesign is out of scope.
- Follow the [migration plan](./plan.md). Implement only the explicitly approved phase, report its validation results and unresolved issues, then stop for the owner's review. Do not automatically start the next phase.
- Treat planned features as requirements, not as already implemented. Inspect the current code before changing it. Keep changes focused and update directly related documentation.

## Architecture and development

- Generate a fully static site for GitHub Pages using GitHub Actions and `withastro/action`. No SSR, adapters, server functions, or runtime backend.
- Production origin is `https://blog.pieeatingninjas.be`, served at the domain root, not a repository-name subpath. Keep canonical URLs, sitemap, feeds, Pages custom-domain settings, and `public/CNAME` consistent.
- Use the VS Code dev container with Node 24 and npm. Keep the lockfile in sync with dependency changes.
- Keep `server.host: true` and dev port `4321`; preserve the dev container's forwarded port.
- Existing npm scripts are `dev`, `build`, `preview`, and `astro`. Use `npm run build` for application validation; do not assume a lint or test command exists. Add focused script tests when adding migration tooling.
- Follow the [existing development instructions](../AGENTS.md) for background dev-server lifecycle commands. Check readiness and stop task-only servers when finished.
- Preserve Astro components, content collections, shared layouts, and template styles rather than adding a UI framework or duplicating helpers unnecessarily.
- Consult the relevant [Astro guides](https://docs.astro.build/): [routing](https://docs.astro.build/en/guides/routing/), [components](https://docs.astro.build/en/basics/astro-components/), [content collections](https://docs.astro.build/en/guides/content-collections/), and [styling](https://docs.astro.build/en/guides/styling/) before related implementation.

## Migration source and privacy

- `_migration/` is gitignored and contains the WordPress XML export and copied `wp-content/uploads`. Never commit it, remove its ignore rule, or publish raw exports, intermediate extracts, or private reports.
- Read migration data locally only. Never send it to external services or copy email addresses or other private personal data into source, public assets, fixtures, logs, reports, or documentation.
- The only allowed public legacy-comment identity fields are the intended display name, safe website URL, and Gravatar hash. Do not export IP addresses, account details, or other WordPress personal metadata.
- Compute the Gravatar hash as SHA-256 of the trimmed, lowercased email in memory; retain only the hash. Never persist or log the email. Audit comment bodies, websites, post content, and metadata too: emails can appear outside dedicated email fields.
- Use synthetic, non-personal fixtures for tests. Keep any private inventories/manifests under `_migration/`; commit only the sanitized mappings needed by the static site.
- Treat imported markup as untrusted. Sanitize comment HTML with an explicit allowlist and safe URL schemes before rendering; remove executable markup and event handlers.

## Content, assets, and URLs

- Preserve exact WordPress post paths: `/YYYY/MM/DD/slug/`, including trailing slashes. Derive dates/slugs from legacy permalinks, not UTC conversion or regenerated titles.
- Preserve public legacy pages and aliases through an explicit old-to-new URL map. Do not silently drop unsupported content or guess replacement URLs.
- Import clean Markdown: no Gutenberg comments, `wp-block` artifacts, WordPress shortcodes, or accidental executable MDX. Preserve meaningful text, links, lists, tables, images, and code.
- Use fenced code blocks with a language tag. Preserve code verbatim; resolve unknown languages explicitly instead of guessing from the blog topic.
- Keep migrated images under `public/wp-content/uploads/YYYY/MM/` so their URLs remain `/wp-content/uploads/YYYY/MM/...`.
- Copy only referenced images. Prefer original files over resized WordPress variants and rewrite references consistently, including links, `srcset`, and metadata. Preserve required legacy image URLs or supply explicit aliases when replacing a referenced variant.
- Rewrite Jetpack `i0.wp.com` image URLs to local upload paths, removing CDN transformation parameters. Do not fetch missing images silently or copy the entire uploads tree.
- Render a paginated home archive at `/`, subsequent pages at `/page/N/`, category archives at `/category/<slug>/`, tag archives at `/tag/<slug>/`, and a 404 page linking to the archive.
- Generate RSS at `/rss.xml` and publish byte-identical XML at `/feed/index.html`, not an HTML redirect or wrapper.
- Put a small script on the home page that resolves `/?p=ID` and `/?page_id=ID` using a sanitized ID-to-local-URL map. Unknown IDs must not redirect arbitrarily.
- Use Astro `redirects` for other legacy aliases. On static GitHub Pages these produce HTML redirects, not HTTP 301/302 responses; do not promise server-side behavior or query-string matching.

## Comments and optional services

- Store legacy comments in JSON per post with name, website, SHA-256 Gravatar hash, date, and sanitized content. Preserve stable comment IDs and parent IDs to render threads.
- Render the approved legacy comment archive statically beneath each post. Handle missing parents and invalid relationships explicitly, without losing approved comments.
- Place Giscus below the legacy comment archive. Keep it disabled until the repository is public and all required configuration values are filled in; do not load its script while disabled.
- Analytics is undecided; Google Analytics is only a candidate. Do not add analytics, tracking IDs, or consent behavior without an explicit decision.

## Verification

- Import tools must be re-runnable Node scripts in `scripts/`, deterministic for the same input, with actionable errors and nonzero exits on failure. Do not overwrite unrelated/manual content or silently fall back on failed conversions.
- Validate representative imports and focused tests before full imports. Build the static site and verify outputs, not just source files or route declarations.
- End the migration with a verification script that checks every inventoried legacy URL and referenced image against `dist/`, including redirect destinations, query-ID mappings, RSS compatibility, and archive pagination.
- Scan `src/` and `public/` for email addresses, including embedded HTML, JSON, metadata, and `mailto:` links. Also check generated output for leaked data. A build or Pages artifact must never contain `_migration/` or raw source data.
- Report missing assets, unmapped URLs, conversion leftovers, unsafe comments, and privacy findings explicitly without printing private values. Do not declare completion with unresolved failures.
