# WordPress to Astro migration plan

## Scope and approval contract

This document is a plan, not approval to execute the migration. The initial task
creates only this file and [the permanent project rules](./copilot-instructions.md).
No migration, dependency, configuration, content, or deployment changes are part
of that task.

Every phase below requires explicit approval to start. At its end, report changes,
validation evidence, outstanding issues, and decisions needed, then **stop for the
owner's review**. Approval of one phase does not approve subsequent phases.

### Standing permission for browser review

From Phase 2 onward, the owner authorizes starting or reusing the local site
after site changes without asking again, so changes can be checked immediately
in the browser. Run `npm run astro -- dev --background` in the current
worktree's Node 24 dev container, keeping `server.host: true` and port 4321.
Check `astro dev status` and an HTTP response before reporting readiness, and
provide the reachable preview URL and relevant page links at handoff.
Leave this review server running for the owner; do not stop it merely because
the phase or assistant turn ends. Stop temporary test-only servers when done.
Reuse an existing server for this worktree rather than starting duplicates, and
do not stop unrelated servers. If port forwarding or the environment prevents
a persistent preview, explain the limitation instead of claiming it is ready.
This permission does not authorize deployment or starting the next phase.

### Definition of phase completion

- A phase is **ready for human review**, not complete, when all its acceptance
  checks pass. The owner must validate its human review checklist and explicitly
  accept it before it is **complete**.
- At each handoff, provide the changed-file summary, exact validation commands
  and exit codes, expected versus actual counts, and the local preview URLs or
  output paths needed to reproduce the checks. Keep private evidence local and
  redact personal values from summaries.
- Every checkbox below must have evidence. A failed check blocks acceptance.
  An inapplicable check needs a written reason and owner approval; missing source
  examples must be covered by synthetic fixtures rather than silently skipped.
- The owner records `accepted` or `changes requested` with the phase number.
  Changes requested must be fixed and revalidated in that phase.
- After the handoff, stop all migration work, even in autonomous mode. Silence,
  passing automation, or acceptance of this plan is not approval to continue.
  Starting the next phase requires an explicit instruction naming that phase.
- Do not mark review checkboxes complete on the owner's behalf. Any intentional
  exception or changed requirement needs explicit owner approval.

Keep template styling throughout. Analytics remains undecided, with Google
Analytics only a candidate; do not implement it as part of this plan without a
separate decision.

## Migration-report baseline and precedence

Use the owner's [migration report](../MIGRATION-REPORT.md) as the initial
content-selection baseline. Reconcile its numbers against local inputs in Phase 1;
do not treat this documentation update as an inventory run or phase approval.

| Area | Planned scope and measurable baseline |
|------|---------------------------------------|
| Posts | Import all 62 published posts; exclude all 5 drafts and draft-only assets. Preserve the listed dated permalinks exactly. |
| Pages | Migrate About, Book, Privacy Policy, and 404; exclude the Home and Blog placeholders. About is an explicit exception to the normal private-content exclusion, subject to privacy review. |
| Assets | Reconcile 125 unique referenced original files (121 images and 4 downloads) before code-image removal and approved exceptions; this is not the final copy count. |
| Code-only images | Replace all 11 listed originals with language-tagged fenced code; review each replacement against its source. |
| Other screenshots | Preserve all 8 unique mixed code/UI images and 8 console/output images as visual media; shared images can occur in more than one post. |
| Optimization | Process all 20 listed oversized/heavy images: 8 dimension cases, 4 heavy stills, and 8 animated GIFs. Record before/after dimensions and byte sizes. |
| External image | Self-host the single listed `pbs.twimg.com` image, subject to reuse permission and privacy checks; no general remote-image crawl. |
| Comments | Archive all 196 approved comments statically and threaded; keep Giscus separately gated. This decision is already made, not reopened by the report. |
| Taxonomies | Reconcile 44 categories and 7 tags; retain distinct category/tag membership and legacy archive paths rather than flattening both into tags. |
| Exclusions | No WordPress PHP/core/plugins/themes/translations, credentials, database backups, Apache rules, or legacy root redirect. Skip 424 size variants and 74 unused originals unless a specific exception is approved. |

Earlier explicit architecture and privacy decisions take precedence over the
report's implementation suggestions: use clean Markdown, preserve dated URLs,
keep upload URLs under `/wp-content/uploads/YYYY/MM/`, retain template styling,
and do not move all assets into `src/assets/` or redesign branding. Do not read,
copy, or print credentials from `wp-config.php` or database backups.

The report's original-only selection and code-image removal must be reconciled
with the legacy-image URL requirement. The Phase 1 manifest must distinguish
retained originals, optimized derivatives, code replacements, download links,
aliases, and explicitly approved omissions. Do not silently discard old image
paths or claim that an HTML redirect can serve image bytes. Where image-path
compatibility requires a retained alias file, obtain approval for that exception
to skipping resized files.

Open review decisions are limited to unresolved details: image compatibility
exceptions and optimization budgets, permitted external-image reuse, PDF source
links, Book page copy, Privacy Policy copy, optional About photos, Search Console
verification method, AdSense retention, and plugin redirects missing from the
export. Analytics and redesign remain outside the approved scope.

## Inspected starting point

- [Package scripts](../package.json): `dev`, `build`, `preview`, and `astro`;
  Astro 7 with MDX, RSS, sitemap, and Sharp. No test or lint script yet.
- [Astro configuration](../astro.config.mjs): placeholder `https://example.com`,
  `server.host: true`, MDX and sitemap integrations, and no adapter.
- [Dev container](../.devcontainer/devcontainer.json): Node 24 and forwarded port
  4321. The package engine currently allows Node versions from 22.23.4 upward.
- [Content schema](../src/content.config.ts): title, description, publication date,
  optional updated date, and optional hero image; five starter posts.
- [Current routes](../src/pages/): template home/about, `/blog/`, filename-based
  `/blog/{id}/`, and `/rss.xml`. No dated URLs, taxonomy archives, or comments.
- [Blog layout](../src/layouts/BlogPost.astro) and
  [global styles](../src/styles/global.css) are the template baseline to retain.
- [Ignore rules](../.gitignore) already exclude `_migration/`. Its contents have
  not been inspected for this documentation task.
- No tracked Pages workflow or custom-domain file exists.

## Phase 1 - Local inventory and migration contract

**Goal:** establish complete, privacy-safe inputs and expected outputs before
writing the importer.

Implementation evidence and proposed decisions are recorded in the
[Phase 1 handoff](migration-phase-one.md). Acceptance remains blocked pending
the documented discrepancies, owner decisions, and human review; the checkboxes
below are intentionally unchanged.

- Reconcile the report baseline above, including counts, shared-image
  deduplication, and its 125-file/121-image totals. Record any discrepancy for
  human resolution rather than changing expected counts to match the importer.
- Confirm `_migration/` remains ignored and is never an Actions input or artifact.
  Read the XML export and copied uploads locally only.
- Add re-runnable Node inventory tooling in `scripts/`. Keep private inventories,
  raw extracts, and reports under `_migration/`; diagnostics must not print
  emails or private values.
- Inventory published posts, pages, exact permalinks, WordPress IDs, dates,
  categories/tags and their original slugs, approved comments and parent links,
  attachments, image references, and legacy aliases.
- Distinguish public content from drafts, private/password-protected posts,
  unapproved comments, spam, and trash. Do not publish excluded content.
  The report explicitly selects the private About page; review and sanitize that
  page before publication, without extending the exception to other private data.
- Classify the four selected pages: About at `/about/`, reconstructed Book at
  `/book/`, updated Privacy Policy at `/privacy-policy/`, and a genuine 404 page.
  Inventory the old 404 content slug separately for its compatibility mapping.
- Inventory the two linked MP4s and two third-party PDFs as well as images.
  Prefer authoritative external PDF links where redistribution is not permitted;
  document their old local URL disposition for owner approval.
- Obtain the `eps-301-redirects` mapping through an owner-provided sanitized
  export/admin list; it is absent from WXR. Do not inspect credentials or raw DB
  backups to obtain it. Missing access blocks complete alias reconciliation.
- Record decisions for Search Console HTML-file versus DNS verification,
  AdSense/`ads.txt` (absent unless retention is approved), safe SEO descriptions,
  Book reconstruction, Privacy Policy updates, and optional About photos.
  Branding/header/favicon changes remain deferred with the redesign.
- Inventory images from content, linked images, featured images, `srcset`, and
  Jetpack URLs. Match originals and resized variants against local files.
- Define an expected-output manifest covering every public legacy URL and used
  image, including query-ID URLs and aliases. Every entry needs a destination or
  explicit owner-approved disposition; do not silently omit missing items.
- Propose the content/comment schemas, sanitized public ID/redirect maps, exact
  legacy-date handling, pagination size, and handling of unsupported shortcodes,
  missing images, and unknown code languages.
- Confirm that "Giscus below the archive" means below the static legacy comment
  archive on each post.

**Deliverables:** local inventory and expected-output manifest, inventory command,
proposed schemas, and a redacted decision/exclusion list.

**Acceptance checks (all required):**

- [ ] For each inventoried record type, total count equals included plus excluded
  count; every excluded record has a reason.
- [ ] 100% of inventoried public URLs and used image references have a manifest
  entry; duplicate paths/IDs and missing local files are counted and listed.
- [ ] Two inventory runs on unchanged input produce identical manifests.
- [ ] `git check-ignore _migration/` succeeds, no `_migration/` files are tracked,
  and no post or asset import has been performed.
- [ ] The decision list covers pagination size, legacy date/slug handling,
  unsupported conversions, missing assets, and Giscus placement.
- [ ] Reconciliation accounts for 62 included posts, 5 excluded drafts, 4 selected
  pages, 2 excluded placeholders, 196 approved comments, 44 categories, 7 tags,
  125 original assets, 11 code-image replacements, and 20 optimization cases.
  Every difference from the report has a documented resolution.
- [ ] Every reported resized/unused asset and each code-image URL has a recorded
  retain/rewrite/alias/omit disposition; no unresolved conflict remains between
  original-only copying and legacy image compatibility.
- [ ] The missing plugin redirect list and every open review decision above are
  resolved or explicitly scoped by the owner; unknown aliases are not reported
  as verified.

**Human review:**

- [ ] Compare inventory totals with the local WordPress export and inspect at
  least one post, page, taxonomy, comment thread, and image mapping of each
  available type.
- [ ] Approve exclusions, schemas, edge-case decisions, and the manifest as the
  baseline for later reconciliation.
- [ ] Explicitly approve publishing sanitized About content, image-URL
  exceptions, download/reuse decisions, optimization budgets, and page-copy
  sources. Confirm that comments and separate taxonomy archives stay in scope.

**STOP:** hand off evidence and wait for Phase 1 acceptance and explicit
authorization to start Phase 2.

## Phase 2 - Static foundation and canonical routing

**Depends on:** approved Phase 1 inventory and routing contract.

The owner explicitly authorized Phase 2 after clarifying that the deliverable is
the migrated blog, not a migration engine. The static foundation is implemented;
see the [README](../README.md#static-blog-foundation-phase-2). Validation:
`npm run test:routing` passes six tests including an isolated static fixture
build; `npm run astro -- check` reports zero errors/warnings (two existing
inventory-parser deprecation hints); `npm run build` generates 11 pages.
The Node 24 background dev server was checked on `0.0.0.0:4321` (`/book/` 200,
unknown URL 404), then stopped. About remains template content, Book/Privacy
remain explicit placeholders, and no WordPress posts have been imported.
Human review remains open; Phase 3 is not started.

Owner-requested follow-up: remove the separate template welcome page now.
The root `/` renders the blog overview, `/blog/` redirects to `/`, and the
header has one Blog link rather than separate Home and Blog links. Starter
article URLs remain unchanged. Pagination and real content import remain
in their later phases.

- Set production `site` to `https://blog.pieeatingninjas.be`, static output,
  trailing-slash policy, and directory-style page output. Do not add adapters,
  SSR, server functions, or a repository-name base path.
- Explicitly retain `server.host: true` and port 4321. Align documented/package
  Node requirements with the Node 24 dev container.
- Extend the content schema with stable legacy ID, exact permalink/date parts,
  categories/tags, and comment linkage as agreed. Keep URL construction in a
  shared helper used by routes, metadata, links, feeds, and later verification.
- Generate dated post routes statically. Define routes for legacy pages from the
  inventory, preserving their public paths rather than forcing them into the
  post URL format.
  Model About, Book, and Privacy Policy independently of posts; reserve 404
  content for the actual error page and its approved legacy-slug mapping.
- Establish synthetic fixtures and focused tests for slug encoding, date
  boundaries/timezones, duplicate paths, trailing slashes, and ID collisions.
- Keep starter content available until replacements are validated; avoid
  inventing redirects from template-only URLs without a real legacy requirement.

**Deliverables:** static configuration, content schema, shared URL helper,
dated/page routes, and synthetic routing tests.

**Acceptance checks (all required):**

- [ ] `npm run build` exits 0; all routing tests pass, including date/timezone,
  slug encoding, duplicate-path/ID rejection, and trailing-slash cases.
- [ ] Every synthetic expected route has its expected `dist/` output and exact
  canonical URL on `https://blog.pieeatingninjas.be`.
- [ ] Schema fixtures retain category and tag identity separately and represent
  all four selected page roles without including placeholder pages or drafts.
- [ ] No adapter, server function, or runtime route is introduced.
- [ ] Inside the Node 24 dev container, the server responds on forwarded port
  4321 with `server.host: true`; record the readiness check.

**Human review:**

- [ ] Open at least one dated post and one legacy page fixture; compare their
  paths and canonicals against the approved routing contract.
- [ ] Review schema fields and confirm the template styling is retained.

**STOP:** hand off evidence and wait for Phase 2 acceptance and explicit
authorization to start Phase 3.

## Phase 3 - Re-runnable Markdown and image import

**Depends on:** approved Phases 1 and 2.

- Implement deterministic Node scripts in `scripts/` for XML parsing, Markdown
  conversion, asset selection/copying, and public mapping generation. Track
  importer-owned outputs so reruns cannot overwrite unrelated/manual files.
- Convert a representative sample first: .NET/MAUI/Azure code, Gutenberg markup,
  shortcodes, tables/lists, featured images, inline/linked images, and Jetpack
  image URLs. Use synthetic fixtures in committed tests.
- Preserve original code text in language-tagged fences. Strip WordPress block
  wrappers/comments and convert shortcodes to their meaningful static
  equivalents; report unsupported cases for review.
- Convert both Crayon (~170 blocks) and Enlighter (~108 blocks), plus Gutenberg
  code blocks. Map C#, XAML/XML, PowerShell, YAML, shell, AppleScript, VB.NET,
  JavaScript, Python, and JSON to supported fence tags. Reconcile exact block
  counts locally; the report's approximate counts are not fixed pass thresholds.
- Replace the report's 11 code-only images with text, reusing nearby source code
  where present. Transcribe locally only where necessary; review every line and
  preserve meaningful annotations (including the warning tooltip and binding
  diagram explanation). Never send screenshots to an external OCR service.
  Preserve mixed code/UI and console screenshots as visual media.
- Convert `[caption]` to an image/caption and `[video]` to static video markup.
  Preserve C# attributes/indexers such as `[CallerMemberName]`; bracket matches
  alone are not a valid shortcode-removal rule.
- Copy only used images to `public/wp-content/uploads/YYYY/MM/`. Prefer originals,
  rewrite all affected references, and preserve used legacy variant paths with
  owner-approved compatibility files. Follow the Phase 1 dispositions for
  removed code screenshots. Detect missing files and name collisions; do not
  bulk-copy the 424 variants or 74 unused originals.
- Process all 20 optimization cases with deterministic tooling. Target still
  images at no more than 1600 px wide and 500 KB (500,000 bytes); use the report's
  smaller suggested dimensions where readability permits. Convert heavy GIFs
  to animated WebP or looping muted inline video without losing animation.
  Record output budgets approved in Phase 1 and any compatibility-file exception;
  do not change file formats without updating references and old-path handling.
- Preserve the two linked MP4 downloads at their required public upload paths;
  handle the two PDF links according to the approved reuse/source-link decision.
- Download only the report's single explicitly selected external image after
  reuse/privacy approval, record its source and local mapping, and reuse the
  local cached input on reruns. Do not silently fetch other missing assets.
- Rewrite `i0.wp.com` URLs and relevant CDN parameters to the correct local
  paths. Do not introduce remote migration services or silently download assets.
- Rewrite the report's 18 absolute internal post links to canonical local paths,
  reconciling the exact count against the export. Replace the two tweet embeds
  with reviewed static links/content and resolve the retired Channel 9 embed to
  an approved archive link or explicit removal; do not leave broken widgets.
- Migrate sanitized About content, reconstruct the empty Book body using
  approved copy for *The MVVM Pattern in .NET MAUI*, and update Privacy Policy
  for actual hosting/comment services and enabled analytics/ads only. Prepare the
  selected 404 content and its `2018/12/image.gif` media for Phase 4.
- Exclude emails and private data from all generated content, metadata, asset
  metadata where applicable, and public maps. Fail with redacted diagnostics on
  privacy findings.
- After sample validation, run the full public-content import. Remove template
  posts/placeholder copy only when replaced and checked; do not redesign.

**Deliverables:** importer commands, clean Markdown, selected local images,
sanitized public maps, and reconciliation/privacy results.

**Acceptance checks (all required):**

- [ ] Imported post/page counts equal the approved included counts; every record
  retains its expected ID and permalink, with zero duplicate outputs.
  The baseline is 62 posts plus the 4 selected page content outputs, not 66 posts;
  404 route rendering is validated in Phase 4. No draft or placeholder is imported.
- [ ] Two complete imports on unchanged input produce identical file lists and
  hashes; a synthetic manually maintained file remains unchanged.
- [ ] 100% of used image references resolve locally or through approved aliases;
  zero unreferenced upload files are copied and zero `i0.wp.com` references remain.
- [ ] Scans report zero Gutenberg/wp-block artifacts, unconverted shortcodes,
  untagged code fences, or unresolved conversion errors.
- [ ] All 11 code-image replacements are present as tagged code, all 8 mixed
  code/UI and 8 console originals remain represented visually, and all 20
  optimization rows have before/after measurements meeting approved budgets.
  Replaced code-image files are absent unless explicitly retained for legacy URLs.
- [ ] Both MP4 links work; both PDF dispositions and the single self-hosted
  external image match the approved manifest. Zero unsupported remote embeds or
  absolute legacy internal post links remain; code attributes/indexers survive.
- [ ] `npm run build`, importer tests, and privacy checks exit 0 with zero email
  findings in generated source/public content.

**Human review:**

- [ ] Compare source and rendered output for a sample covering every conversion
  feature listed above, using synthetic examples where the export lacks a case.
  Record the sample paths and pass/fail result for each feature.
- [ ] Check code text/language tags, original-image selection, and all manual
  conversion resolutions; confirm no meaningful content was lost.
- [ ] Review all 11 code-image conversions line by line and all 20 optimized
  images/animations for legibility, motion, and acceptable quality.
- [ ] Approve About, reconstructed Book, Privacy Policy, prepared 404 content,
  and all external-media/download dispositions against the agreed copy.

**STOP:** hand off evidence and wait for Phase 3 acceptance and explicit
authorization to start Phase 4.

## Phase 4 - Archives, feeds, and legacy URL compatibility

**Depends on:** approved imported content and canonical routes.

- Replace template home content with the paginated post archive at `/`; generate
  `/page/N/` for subsequent pages with consistent ordering and navigation.
  Decide the disposition of `/page/1/` explicitly.
- Generate category and tag archives at `/category/<slug>/` and `/tag/<slug>/`
  using preserved taxonomy slugs. Paginate these archives consistently where
  needed and document their continuation paths.
- Add a static 404 page with a clear link to the home archive.
  Use the report's selected legacy 404 content and optimized animation; map its
  old content slug explicitly without turning unknown requests into HTTP 200s.
- Generate `/rss.xml` with canonical legacy post URLs. Produce the same XML bytes
  at `/feed/index.html` during the build, without an HTML wrapper or redirect.
  Check actual GitHub Pages content-type behavior later; the `.html` suffix may
  be served as HTML even though its body is XML.
- Add the small home-page query redirect script for `p` and `page_id` using the
  sanitized ID map. Restrict destinations to known local URLs, handle unknown
  IDs without an arbitrary redirect, and preserve applicable fragments.
- Configure Astro `redirects` for all other inventoried aliases. Verify the
  generated static HTML redirects and destinations; GitHub Pages does not
  provide Astro server-side HTTP redirects or query-based routing.
  Include the separately supplied `eps-301-redirects` list and selected page
  aliases; retain original category and tag slugs as separate archive namespaces.
- Align internal links, canonical metadata, sitemap, RSS discovery, and existing
  template navigation with the implemented routes.

**Deliverables:** archive routes/navigation, 404 page, both feed files, query-ID
script/map, Astro redirects, and compatibility test results.

**Acceptance checks (all required):**

- [ ] For the home archive and each taxonomy, the union of paginated post IDs
  equals the expected set with zero duplicates; page count equals the ceiling
  of expected post count divided by the approved page size for nonempty sets.
  Empty-set behavior matches the approved contract.
- [ ] All generated previous/next links and the 404 archive link resolve.
- [ ] Both feeds parse as XML; `cmp dist/rss.xml dist/feed/index.html` exits 0;
  all feed item URLs match the canonical URL map.
- [ ] Every inventoried query ID maps to a generated destination. Browser tests
  cover one valid post ID, one valid page ID, an unknown ID, malformed input,
  and a fragment; zero arbitrary/off-site redirects occur.
- [ ] Every inventoried alias produces the expected static redirect and reaches
  an existing destination without a loop; `npm run build` and route tests exit 0.
- [ ] All 44 categories and 7 tags are accounted for separately in the approved
  taxonomy mapping; every nonempty term has its expected archive. The 62 posts
  appear in home pagination without adding About, Book, Privacy Policy, or 404.

**Human review:**

- [ ] Browse the home archive's first, middle, and last pages where present,
  plus one category and tag archive; check ordering and navigation.
- [ ] Open both feeds, follow one legacy alias and each query-ID form, and open
  the 404 page to verify its archive link.

**STOP:** hand off evidence and wait for Phase 4 acceptance and explicit
authorization to start Phase 5.

## Phase 5 - Static legacy comments and gated Giscus

**Depends on:** approved post import and stable legacy IDs.

- Extend import tooling to write JSON per post containing public display name,
  safe website, SHA-256 Gravatar hash, date, sanitized content, and stable
  comment/parent IDs. Import only approved comments.
- Normalize email by trimming and lowercasing before hashing in memory. Never
  serialize or log the email, IP address, or other private WordPress metadata.
  Sanitize emails embedded in body text, links, and display fields too.
- Sanitize imported comment HTML with an explicit allowlist, stripping scripts,
  event handlers, unsafe URL schemes, and other executable content.
- Render comments statically and threaded below posts, retaining legacy comment
  anchors where present. Resolve orphaned parents and detect cycles explicitly;
  preserve approved replies without exposing excluded parent content.
- Add Giscus below this legacy comment archive. Default it to disabled and
  document its configuration: public repository, Discussions/category setup,
  repository/category IDs, and stable discussion mapping.
- Leave Giscus disabled until the repository is public, configuration is complete,
  and the owner approves enabling it. No script or network request when disabled.

**Deliverables:** per-post comment JSON, comment importer/sanitizer tests, static
thread rendering, and disabled-by-default Giscus configuration.

**Acceptance checks (all required):**

- [ ] Per-post and total rendered comment counts equal approved inventory counts;
  zero excluded comments or private metadata fields are exported.
  Baseline: 196 approved comments, including 27 on the PDF-display post; any
  discrepancy requires reconciliation rather than silently dropping comments.
- [ ] Hash tests match SHA-256 of trimmed/lowercased synthetic addresses; all
  stored nonempty Gravatar hashes are 64 hexadecimal characters.
- [ ] Fixtures cover nested replies, missing/excluded parents, cycles, unsafe
  markup/URLs, and embedded emails; all tests pass with explicit expected output.
- [ ] Every imported legacy comment anchor resolves; privacy scans of `src/`,
  `public/`, and `dist/` report zero emails; `npm run build` exits 0.
- [ ] With Giscus disabled, generated pages contain no Giscus embed script and a
  browser network check records zero Giscus requests.

**Human review:**

- [ ] Compare at least one nested thread and one orphan-handling example against
  approved source/fixture data; verify names, dates, ordering, and safe links.
- [ ] Confirm Giscus placement below legacy comments and its disabled state.
  Any enablement is a separate explicit decision after prerequisites are met.

**STOP:** hand off evidence and wait for Phase 5 acceptance and explicit
authorization to start Phase 6.

## Phase 6 - Final verifier and GitHub Pages release readiness

**Depends on:** approved Phases 1-5. No production cutover without separate approval.

- Finish a re-runnable Node verification script in `scripts/`, runnable after
  `npm run build`, using the complete private expected-output manifest locally.
- Check every old public URL and used image against `dist/`: directory routes
  resolve to their `index.html`, direct files exist, redirects contain the
  intended destination and terminate at real output, and query-ID entries map to
  generated pages. File existence alone must not count as redirect correctness.
- Check pagination coverage, category/tag membership, comment anchors/counts,
  feed XML validity and byte equality, canonicals/sitemap, local image references,
  and absence of WordPress leftovers or unwanted template content.
- Fail on email addresses in `src/` or `public/`, including encoded/embedded
  forms and `mailto:` links; inspect `dist/` for leaks too. Ensure raw exports,
  private manifests, unused uploads, and `_migration/` never enter build artifacts.
  Report paths/counts without echoing private matches.
- Test the verifier with deliberately missing routes/images, broken aliases,
  invalid feeds, and synthetic email leaks so nonzero failures are demonstrated.
- Add a GitHub Pages Actions workflow using `withastro/action`, appropriate Pages
  permissions, concurrency, and deployment environment. Build from committed,
  sanitized content only; ordinary CI must not require `_migration/`.
- Run public-data-only checks in CI; reserve full export-based reconciliation for
  local verification. Commit sanitized expectations only where needed for CI.
- Add `public/CNAME` for `blog.pieeatingninjas.be`; document Pages settings, DNS,
  HTTPS, local import/verification commands, Giscus gating, and rollback steps.
- Implement the approved Search Console method (verification HTML file or DNS).
  Include `ads.txt` only if AdSense retention was explicitly approved; do not
  infer consent to ads or analytics from files found in the dump.
- Enforce artifact exclusions for PHP, WordPress core/plugins/themes/languages,
  `wp-config*`, UpdraftPlus/database backups, Apache rules, legacy root redirect,
  drafts, placeholders, and unselected assets. Review selected images and
  downloads visually for personal data, not only text-file email matches.

**Deliverables:** final verifier command, local full-coverage report, public-only
CI checks, gated Pages workflow, custom-domain file, and release/rollback runbook.

**Acceptance checks (all required):**

- [ ] Build, all focused tests, public-only CI checks, and the full local verifier
  exit 0. Report checked/expected URL and image counts: coverage must be 100%,
  with zero unapproved omissions, broken destinations, or privacy findings.
- [ ] Each deliberate missing-route, missing-image, broken-alias, invalid-feed,
  and synthetic-email fixture makes the verifier exit nonzero.
- [ ] A clean build without `_migration/` passes public CI checks and generates
  the complete deployable site using only committed sanitized inputs.
- [ ] Artifact inspection finds zero private inputs/manifests or unused uploads;
  `dist/CNAME` contains exactly `blog.pieeatingninjas.be`.
- [ ] The full report-disposition manifest is reconciled: all selected content,
  11 code replacements, 20 optimization results, comments, downloads, and aliases
  pass; every excluded/conditionally retained item has its approved disposition.
  Automated checks find zero prohibited WordPress/runtime/backup files.
- [ ] Search Console verification matches the approved method; `ads.txt` is
  absent unless explicitly approved. The Privacy Policy matches services
  actually enabled; no unapproved analytics or advertising script is present.
- [ ] Deployment is gated so merging this phase cannot publish or change DNS
  before approval. Record the reviewed revision, CI run, and artifact identity.

**Human review:**

- [ ] Review the coverage report and locally preview the exact release artifact.
- [ ] Review workflow permissions, deployment gate, Pages/domain settings, DNS
  changes, and actionable rollback steps.
- [ ] Explicitly approve or reject deployment and custom-domain cutover for the
  identified revision/artifact; do not infer approval from passing CI.

**STOP:** wait for Phase 6 acceptance and explicit authorization to start Phase 7
with production deployment and DNS changes.

## Phase 7 - Approved cutover and live smoke checks

**Depends on:** explicit release approval and access to Pages/domain settings.

- Enable GitHub Pages via Actions and deploy the reviewed static artifact.
  Configure the custom domain/DNS and verify HTTPS without interrupting the
  existing WordPress site prematurely.
- Verify the live domain, dated posts, images, archive navigation, 404 handling,
  both feeds, representative static redirects, and both query-ID forms.
  Record the actual `/feed/index.html` response headers and compatibility limits.
- Confirm no private source or unused upload data is published. Verify Giscus
  remains disabled, or test it only after its separate prerequisites/approval.
- Verify Search Console ownership with the approved method. Keep WordPress
  credential retirement as an owner-operated shutdown step: once rollback no
  longer depends on the old service, rotate/revoke its DB credentials and salts,
  and retain necessary backups securely outside the repository. Never copy their
  contents into release evidence.
- If release checks fail, stop and follow the reviewed rollback procedure;
  retain the WordPress source/backup until the owner accepts the migration.
- Report unresolved hosting limitations honestly; do not substitute SSR or a
  server backend to bypass the static-only requirement.

**Deliverables:** deployed revision/artifact identity, successful Actions run,
live smoke-check results, and owner release decision.

**Acceptance checks (all required):**

- [ ] The approved revision is deployed by a successful Pages Actions run;
  `https://blog.pieeatingninjas.be/` returns HTTP 200 with valid HTTPS.
- [ ] Live requests for every inventoried direct page/image return HTTP 200;
  every alias reaches its approved destination. Both query-ID forms pass browser
  checks and an unknown path returns HTTP 404 with the intended archive link.
- [ ] Both live feed bodies parse and are byte-identical. Record response
  content types and require explicit owner acceptance of any hosting limitation.
- [ ] Home/category/tag pagination and legacy comment anchors pass live smoke
  checks; disabled Giscus makes zero requests. If separately enabled, verify a
  test discussion maps to its intended post.
- [ ] The full local verifier exits 0 for the released revision. No private input
  paths appear in the deployed artifact, and privacy scans report zero findings.

**Human review:**

- [ ] Open the production home, a dated post with images/code/comments, a legacy
  page, both taxonomy archives, feeds, and the 404 page.
- [ ] Confirm the release evidence and any explicitly accepted hosting limits;
  accept the migration or request rollback/fixes. Retain WordPress backups.
- [ ] Confirm Search Console verification and ownership of the separate
  credential-retirement/offline-backup checklist before retiring WordPress.

**STOP:** wait for the owner's final release acceptance. Analytics and any
redesign remain separate future work.
