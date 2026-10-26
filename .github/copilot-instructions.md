# Project instructions

## Site and development

- This repository contains a personal .NET, MAUI, and Azure blog built with
  Astro. Maintain the static site and its checked-in content; do not add import
  tooling.
- Generate a fully static site for GitHub Pages. Do not add SSR, adapters,
  server functions, or a runtime backend.
- The production origin is `https://blog.pieeatingninjas.be` at the domain root.
  Keep canonical URLs, sitemap, feeds, redirects, and Pages configuration
  consistent.
- Use the VS Code dev container with Node 24 and npm. Keep `package-lock.json`
  synchronized with `package.json`.
- Keep `server.host: true`, development port `4321`, and the dev container's
  forwarded port.
- Run `npm run build` to validate site changes. Use the focused tests available
  in `package.json` when changing the related behavior.
- Follow [AGENTS.md](../AGENTS.md) for background development-server lifecycle
  commands. Preserve the existing Astro components, content collections,
  layouts, and shared styles.

## Content, assets, and routes

- Preserve migrated post URLs exactly as `/YYYY/MM/DD/slug/`, with trailing
  slashes. Use the reviewed legacy metadata and static URL maps; do not
  regenerate legacy paths from titles or silently drop aliases.
- Preserve `C#` as its taxonomy display name and use the recorded legacy slugs
  for category and tag archive paths.
- Keep migrated images under `public/wp-content/uploads/YYYY/MM/` where their
  historical URLs resolve. Do not copy unrelated assets into the site.
- Treat rendered comment markup as untrusted. Retain the explicit HTML and URL
  allowlists, and do not publish source email addresses, IP addresses, or
  unrelated personal metadata.
- Giscus must not load while disabled. Analytics must remain consent-gated;
  do not add tracking or change consent behavior without approval.

## Privacy

- `_migration/` is ignored and may contain private WordPress source material.
  Never commit it, publish it, or send it to external services.
- Do not add raw exports, private inventories, or personal source data to
  fixtures, source files, public assets, logs, or documentation.
