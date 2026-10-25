# Astro Starter Kit: Blog

## Dev container and VS Code tunnel

The dev container uses Node 24 and installs the standalone stable VS Code CLI
as `code-tunnel`, without replacing the editor's existing `code` command.
After changing the container configuration, run **Dev Containers: Rebuild
Container** from the VS Code Command Palette.

To open a tunnel into the running container:

```sh
code-tunnel tunnel --name pieeatingninjas-dev
```

Accept the license and authenticate interactively with your GitHub account.
Open https://vscode.dev/agents with the same account, select the tunnel, and
choose `/workspaces/PieEatingNinjas-Blog`. If the browser Agents experience is
not available on stable, use https://insiders.vscode.dev/agents.
Keep the command and container running; press Ctrl+C to stop the tunnel.
No tunnel is started and no credentials are embedded during the image build.
Rebuilding installs the current stable CLI; authentication stored inside the
container might need to be repeated after a rebuild.

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
codeRepositories: ['https://github.com/example/sample-code']
```

The exact legacy path determines the route and canonical URL, not the content
filename or the machine's timezone. The same WordPress ID will link the post
to its future static comment archive. IDs and paths must be unique across posts
and selected pages. Categories and tags remain separate. Starter posts without
legacy metadata retain their `/blog/{id}/` URLs.

`codeRepositories` is optional (defaults to an empty list in the collection).
Use it only for repositories containing the post's example code, not general
GitHub references, dependencies, profiles or issues. Values must be unique
HTTPS URLs of the form `https://github.com/owner/repository`, without a trailing
slash, query, fragment or subpath. Multiple example repositories are supported.
Original links remain in the article; no badge or icon is rendered yet.
The pilot importer uses an explicitly reviewed per-post selection, checks that
each selected URL is present in the source, and preserves it on reruns rather
than guessing from every GitHub link. The Rx and Pivot posts currently have
their respective example repositories recorded.

For the language C#, `categories` and `tags` contain **`C#`**, not `C` or `c`.
The importer uses the source term's name to distinguish C# from the separate
C language. It preserves exact original taxonomy slugs separately, for example:

```yaml
categories: ['C#', uwp]
tags: ['C#']
legacy:
  id: 123
  path: /2020/02/29/original-slug/
  taxonomySlugs:
    categories: [c, uwp]
    tags: [c]
```

Future archive routes must use those legacy slugs (`/category/c/`, `/tag/c/`),
not regenerate URLs from `C#`. Category and tag namespaces stay separate.
Other taxonomy values retain their existing import behavior.
Both this rule and the example-repository convention are recorded in the
[persistent project instructions](.github/copilot-instructions.md).
The metadata follow-up passed 21 focused importer/routing tests, Astro check,
the static build and the pilot verifier (including exact C# values, retained
legacy slugs and both example-repository links).

About, Book, Privacy Policy, and the actual 404 page have independent routes.
About still contains template copy; Book and Privacy Policy explicitly show
pending-content placeholders. No private About content or final legal copy has
been published. The old 404 content slug redirects to `/404.html`.
Template styling remains the current baseline; the whole-blog redesign is
planned for Phase 7.

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

### Phase 3: five-post review pilot

The initial checkpoint covered **only the oldest five published posts**, in
the order of the migration report. The owner subsequently authorized importing
the remaining posts; see the [full post import](#phase-3-all-published-posts)
below. Neither checkpoint authorizes importing pages, comments or later phases.

| Date | Post | Existing text code blocks | Image-to-code replacements | Retained images |
|---|---|---:|---:|---:|
| 2015-11-05 | Starting a blog since 2011... | 0 | 0 | 1 featured |
| 2015-11-07 | Deferred Loading, mind the Visual State Manager | 1 | 2 | 4 |
| 2015-11-14 | Using Rx in a UWP project with MVVM | 9 | 0 | 0 |
| 2015-11-15 | x:Bind and inheritance | 0 | 2 | 2 |
| 2015-12-30 | Disable gestures on Pivot control | 0 | 3 | 2 |
| **Total** | **5 posts** | **10** | **7** | **9** |

The [importer](scripts/migration-import.mjs) uses the seven transcriptions
directly from the [reviewed extraction report](IMAGE-CODE-EXTRACTION-REPORT.md).
The warning tooltip and the two annotated Pivot XAML screenshots remain
images. The annotated 2017 binding diagram was excluded from the pilot and is
retained as an image in the full post import. The inventory baseline/tests use seven replacements and
twelve retained mixed/annotated originals instead of the superseded eleven/eight.

The original dated post paths, IDs, separate category/tag slugs, paragraph
breaks, image captions and code are retained. The styled `Button_Tapped`
fragment is reconstructed as one C# fence; the nine original Rx code blocks
were compared verbatim with the built HTML (apart from terminal newlines).
All seven screenshot transcriptions match rendered code exactly.
No existing equivalent code block was found beside the seven replaced images.
The inheritance post's historical publication-date note remains unchanged;
its URL and frontmatter use November 15 as required by its permalink.
Three obsolete AdSense elements are explicitly removed; no ads, analytics,
comment data or external scripts are imported.

Only the nine referenced original image paths are copied, never the seven
replaced screenshots or their resized variants. Images without metadata remain
byte-identical; Sharp strips metadata from the other originals, retaining
dimensions and format (JPEG quality 100 with 4:4:4 subsampling). Each image is
below 1600 px wide and 500,000 bytes. Input/output byte counts, dimensions,
hashes, post identities and proposed asset aliases are recorded in the
[sanitized public map](src/data/migration-pilot.json). It contains no raw WXR,
comments or author metadata.

Run in the Node 24 dev container with the private export and dated uploads
under the ignored `_migration/`, or specify a separate local source directory:

```sh
npm run migration:pilot
# Alternative, used for this worktree with read-only private inputs:
npm run migration:pilot -- --source /migration-source
node --test scripts/migration-import.test.mjs scripts/migration-inventory.test.mjs scripts/routing.test.mjs
npm run astro -- check
npm run build
npm run migration:verify-pilot
```

The pilot command deliberately cannot select a different sample. A changed five-post
selection, unknown language/shortcode/embed, external image, missing file,
unsafe URL, privacy finding, symlink or output collision exits nonzero with
redacted diagnostics. Ownership hashes live only in
`_migration/pilot/state.json`; retain this private local state for reruns.
Modified imported files and existing unowned files are not overwritten.
Manual content elsewhere is left alone. The separately authorized full-post
command adds video/download handling, reviewed code-language resolutions and
heavy-image optimization. After a full import, rerunning the pilot command
fails rather than removing outputs belonging to the full import; use
`migration:posts` for subsequent reruns.

Validation on 2026-10-24: **34/34 tests passed**, Astro check exited 0
(two existing XML-validator deprecation hints), build exited 0, and the
pilot verifier exited 0. Two actual-source imports produced identical output
hashes; synthetic reruns also preserved a manually maintained file and
rejected edits/collisions. Source, public assets and generated textual output
had zero email/privacy or migration-artifact findings. All five exact routes
and canonicals, all 17 rendered code blocks, all nine local images, mapped
destinations and image budgets passed output checks. Browser smoke checks
returned HTTP 200 for all five posts with no broken article images.

The review server is left running in this worktree's separate Node 24
container. Reach it at **http://localhost:4323/**; host port 4323 forwards to
the unchanged development port 4321 inside the container. Start explicitly
with `npm run astro -- dev --background --host 0.0.0.0 --port 4321` if needed:
the initial background invocation without explicit flags selected 5173 on
this Astro version. Use `npm run astro -- dev status`, `dev logs`, and
`dev stop` inside that container to manage it. Docker must remain running.

**Pilot review boundary:** image legibility and the rendered posts require
owner review. The remaining posts were subsequently authorized separately;
all selected pages, earlier inventory discrepancies,
legacy variant/screenshot aliases (the map records destinations but does not
serve redirects yet); archive pagination, query redirects, feed compatibility
and comments remain in their planned phases. Page placeholders remain.
Nothing has been deployed.

### Phase 3: all published posts

The owner authorized importing the remaining 57 posts after the five-post
checkpoint. `migration:posts` selects all **62 published, non-password-protected
posts**; it excludes drafts and all pages/comments. It preserves exact legacy
post URLs and IDs, separate taxonomy namespaces and legacy slugs, `C#` names,
and explicitly reviewed example-code repositories.

```sh
npm run migration:posts -- --source /migration-source
node --test scripts/migration-import.test.mjs scripts/migration-inventory.test.mjs scripts/routing.test.mjs
npm run astro -- check
npm run build
npm run migration:verify-posts -- --source /migration-source
```

Omit `--source` when using the standard local ignored `_migration/` inputs.
These are migration-only commands, not part of `npm run build` or the running
static site. New posts can be written directly in Markdown.

The [reviewed conversion resolutions](scripts/migration-resolutions.mjs)
record code-language decisions, sample repositories, preferred image widths
and authoritative PDF source references. Root repository metadata is extracted only from
reviewed selections; original branch-specific links stay in the body.
Source blocks reconcile to 166 Crayon, 108 Enlighter and 7 Gutenberg `<pre>`
elements. One Gutenberg block contains whitespace only and is explicitly
omitted. The styled C# fragment adds one block; the seven code screenshots
add seven more. Code text is checked against built HTML, not just fence counts.

Referenced image originals are used before resizing. Output stills stay at
or below 1600 px and 500,000 bytes, using the report's smaller widths where
specified; oversized stills are resized and heavy stills become WebP if needed.
Animated GIFs become animated WebP, retaining animation loop and total timing.
The encoder can coalesce frames: four animations have fewer output frames,
so frame-count equality is not promised. Animation appearance and image
legibility still require owner review.
Dimensions, frame counts, timing and before/after bytes are recorded per file
in the [sanitized full-post map](src/data/migration-posts.json). Original and
used variant paths whose destination changes are mapped explicitly; serving
those compatibility aliases is still Phase 4 work.

Transformed media is cached only under ignored `_migration/post-media-cache/`,
keyed by input SHA-256, original path and transformation policy version.
Unchanged reruns reuse the checked cache; missing/corrupt entries fail
explicitly. Retain `_migration/pilot/state.json` for ownership checks.
The original pilot map is retained as a historical checkpoint; the full-post
map and verifier are authoritative after this import.

Post-specific dispositions, with visual/content review still open:

- The owner explicitly requested a local copy of the Xamarin archive screenshot.
  It is rendered from `/wp-content/uploads/2024/05/xamarin-archived.jpg`, not
  hot-loaded or replaced by a source link. The downloaded source is staged at
  `blog/wp-content/uploads/2024/05/xamarin-archived.jpg` inside the private source
  directory. Keep it there for reruns; a missing copy fails the import rather
  than silently fetching it. The original public URL and local mapping are
  recorded in `scripts/migration-resolutions.mjs`.
- At the owner's explicit request, both eID PDFs are now hosted locally at their
  original `/wp-content/uploads/2020/02/` paths, using the original private upload
  files rather than fetching dependencies on each run. Document identity/XMP
  metadata is removed deterministically with the migration-only `pdf-lib`
  dependency. Both PDFs were locally audited for email addresses in extracted
  text, metadata and raw bytes, with zero findings. A documentation-source note
  links to `https://github.com/Fedict/eid-mw`; the verified upstream file URLs
  remain recorded in `scripts/migration-resolutions.mjs`. Following owner feedback, the misleading
  "Belgian eID content document" reference beside the address-file diagram now
  targets the content specification instead of the applet reference manual.
- The two original author-demo MP4s keep their upload paths and become static
  `<video controls preload="metadata">` players with download links.
  Their sizing is centralized in `src/layouts/BlogPost.astro`, including videos
  rendered from Markdown. The CSS custom property `--post-video-width` defaults
  to `auto` (intrinsic width). During the design phase, set it globally in
  `src/styles/global.css`, for example `:root { --post-video-width: 480px; }`,
  or override it on an individual video. Videos remain capped at the prose
  width and retain their aspect ratio; no per-post markup changes are needed
  for a site-wide size adjustment.
- Two occurrences of an illustrative personal address in the Linkify article
  become `[email address omitted]`. Literal `mailto:` code and explanations
  remain: a URI scheme name by itself is not a private address.
- Existing tweet and Channel 9 references are already static anchor links in
  the export, not embedded widgets. They remain links; no replacement video
  URL or remote widget is invented.
- The Step-Through ListView post intentionally shares its source through a
  public OneDrive download, not GitHub. Its original sharing link is retained;
  URL validation narrowly recognizes OneDrive's public `/redir` share format,
  without permitting generic authentication/token query parameters elsewhere.

Validation on 2026-10-24:

- **62 posts** imported; the five replaced Astro starter articles were removed
  after validating the migrated outputs. Synthetic tests still cover fallback
  routes for new posts without legacy metadata.
- **288 exact rendered code blocks**, including all **7** approved code-image
  replacements; **28 posts** have **29** reviewed repository references.
- **118 local media/document files**: **114 images/animations**, including **14 animated
  WebP files**, **2 MP4s** and **2 PDFs**. Image bytes decreased from **21,413,147** to
  **10,868,905** (49.2%). All image width/byte budgets passed. The verifier
  covers **19** post optimization cases; the report's remaining case belongs
  to the out-of-scope 404 page.
- **48/48 tests passed**. Astro check reported zero errors/warnings and two
  existing XML-validator deprecation hints. The build emitted **67 static
  pages**; the full-post output verifier passed with zero privacy/output
  findings. Two reviewed illustrative address occurrences were redacted.
- Two actual-source reruns produced identical owned-file lists and SHA-256
  hashes. No private export, cache or migration intermediate is published.
- Browser checks found all **62** home-archive links, no starter links or
  broken archive images, and HTTP 200 for every post. Seven representative
  posts had no broken article images; both MP4s loaded and advanced playback.
- Feedback regressions cover separate paragraphs for standalone screenshots,
  including the linked Linkify image, inline code without artificial padding,
  and the corrected eID content-document link. Both reported images are local
  and verified in the built output.

The owner accepted and closed Phase 3's implemented post-only scope on
2026-10-24 after reviewing the posts and follow-up corrections.
The review site remains **http://localhost:4323/** (container port 4321).
Remaining pages, the 404-only optimization case, comments, archive pagination,
feed compatibility, query-ID redirects, legacy alias serving and deployment
remain outstanding, outside this completed scope. Acceptance does not
authorize starting the next phase.

### Phase 4: archives, feeds and compatibility

Implementation is available for review, but **Phase 4 acceptance is blocked**
by the unresolved input/disposition decisions below. Phase 5 was explicitly
authorized on 2026-10-25; that work does not resolve the Phase 4 blockers or
authorize deployment, and the Phase 4 human-review checkboxes remain open.

- Home pagination uses the Phase 1 proposal: **10 posts per page**, newest
  publication date first, descending WordPress ID as the date tie-breaker.
  The 62 posts produce seven pages: `/`, `/page/2/` through `/page/7/`.
  `/page/1/` is an explicit static HTML redirect to `/`.
  This page-size proposal still needs owner acceptance; it is not recorded
  as approved merely because it has been implemented.
- All **44 categories and 7 tags** retain their separate legacy namespaces.
  Continuations use `/category/<slug>/page/N/` and `/tag/<slug>/page/N/`;
  each namespace's `/page/1/` redirects to its first page. Empty terms retain
  one landing page with an empty state and no continuation pages. The actual
  inventory has no empty terms; synthetic build tests cover that case.
  `C#` remains the display name for `/category/c/` and `/tag/c/`.
  Post footers link to their category/tag archives using the preserved slugs.
- Both `/rss.xml` and `/feed/index.html` contain **byte-identical RSS XML**
  with all 62 canonical post URLs in archive order. The compatibility feed
  is not an HTML redirect or wrapper. GitHub Pages may serve its `.html`
  extension as `text/html`; live hosting/content-type checks remain deferred.
- A small script on `/` handles the **66 selected post/page query IDs**.
  Valid `p` and `page_id` requests preserve fragments; unknown, malformed,
  duplicate or conflicting IDs do not navigate. Destinations are known local
  routes only. This is client-side navigation, not HTTP query routing.
- **73 static HTML redirects** cover nine old dated paths, two placeholder
  paths, the selected 404 alias, 52 first-page aliases and nine code-image
  replacement paths. Destinations and code anchors are checked in the build.
  These are not GitHub Pages HTTP 301/302 rules.
- **85 referenced/optimized image aliases** are prerendered as image bytes at
  their legacy upload paths, byte-identical to the optimized canonical files.
  No private inputs are needed by the site build; these static endpoints read
  only checked-in public assets. They are not runtime server functions.
  Some historical extensions differ from the optimized encoding (e.g. GIF
  aliases containing WebP bytes). Browser decoding is checked locally;
  production MIME behavior remains a deployment smoke-check requirement.
- The genuine 404 page uses the selected legacy text and animation, plus a
  home-archive link. The animation remains a GIF because its **65,536-play**
  loop cannot be represented exactly by WebP's loop field. Optimization keeps
  all 29 frames, 3,480 ms total timing, 400 x 300 dimensions and the original
  loop, reducing **671,698 bytes to 459,982 bytes**. Unknown routes still return
  404 locally; no catch-all success page was added.
- Archive cards retain the template's existing markup and styles in the shared
  archive layout. Branding, About/Book/Privacy copy, comments, Giscus, analytics
  and deployment remain unchanged.

The ignored source directory is **`_migration/` (singular)**. Git does not copy
it into a new worktree. Manually restore the private export, uploads and inventory
there, retaining the importer ownership state for reruns. Never stage the folder.
Alternatively, `--source` can point to another local source folder; inventories
and ownership state still belong under the current worktree's `_migration/`.

The re-runnable compatibility importer checks the inventory's source checksum,
rejects symlinks and output collisions, and keeps its ownership hashes only at
`_migration/compatibility/state.json`. The sanitized runtime mapping is
`src/data/migration-compatibility.json`. To supply plugin aliases, place an
owner-sanitized `eps-301-redirects.json` directly in the private source directory,
as an array such as `[{"from":"/old-path/","to":"/about/"}]`. Only known local
content destinations are accepted; query rules, external destinations, private
values and extra fields fail explicitly. An explicitly supplied empty array
records that the reviewed list contains no rules.

Run in the Node 24 dev container:

```sh
npm run migration:compatibility
node --test scripts/migration-compatibility.test.mjs scripts/migration-import.test.mjs scripts/migration-inventory.test.mjs scripts/routing.test.mjs
npm run astro -- check
npm run build
npm run migration:verify-posts
npm run migration:verify-compatibility
cmp dist/rss.xml dist/feed/index.html
# Acceptance gate: intentionally exits 1 while unresolved decisions remain.
npm run migration:verify-compatibility -- --check
npm run astro -- dev --background
npm run astro -- dev status
```

Validation on 2026-10-25:

| Check | Expected | Actual / exit code |
|---|---|---|
| Focused migration/routing tests | All pass | 54/54; exit 0 |
| Astro check | No errors/warnings | 0 errors, 0 warnings, 4 XML-validator deprecation hints; exit 0 |
| Static build | Home, terms, selected pages and posts | 134 pages (68 archives + 62 posts + 4 selected pages), plus redirects and static endpoints; exit 0 |
| Home archive union | 62 distinct posts, 7 pages | Exact set and ordering; no duplicates or selected pages; exit 0 |
| Taxonomy mapping | 44 categories / 7 tags | Exact source memberships, all continuation/navigation links resolve; exit 0 |
| Query-ID mapping | 66 generated destinations | 66/66; exit 0 |
| Known HTML / image aliases | 73 / 85 | All destinations and bytes verified; exit 0 |
| Feeds | Equal bytes, valid XML, 62 canonical links | Exact match; verifier and `cmp` exit 0 |
| Existing post verification | Original content and media preserved | 62 posts, 288 exact code blocks, 118 post assets; exit 0 |
| Privacy scan | No private values or raw source in source/public/build | Zero findings; exit 0 |
| Real-source reruns | Same owned output bytes | Two reruns with identical SHA-256 hashes; exit 0 |
| Acceptance gate | Fail with unresolved dependencies | Exit 1, expected; not phase acceptance |

Browser automation checked the first/middle/last home pages, both `c` namespaces,
the final C# category page, navigation/card counts, no broken archive images,
the 404 archive link, a historical alias, and eight query cases (valid post,
valid page, fragment, unknown, malformed, duplicate, conflicting and off-site
input). Unknown paths returned 404. This is automation evidence, not owner
visual acceptance.
All 85 exact legacy image URLs also returned HTTP 200 with their expected bytes.
A format-changing GIF alias decoded successfully in the browser even when its
WebP bytes were wrapped with the historical `image/gif` MIME type. Literal image
extension routes avoid Astro's page-style trailing-slash matching for these
binary endpoints.

**Outstanding blockers, not silently omitted or guessed:**

1. The `eps-301-redirects` list is still absent; its aliases cannot be reconciled.
2. **394 attachment-page/query URL dispositions** still need owner decisions.
   Attachment IDs are not added to the post/page query map.
3. **417 additional inventoried image-variant URLs** still need approval or
   explicit exclusion. The 70 referenced paths are covered by the 68 image and
   two code-variant mappings; copying all other variants was not authorized.
4. Accept or change the proposed page size, empty-term behavior and historical
   slug/date aliases after reviewing their source-derived mappings.
5. About, Book and Privacy Policy remain the previous phase's placeholder copy.
   Their query destinations exist, but their final content is not claimed here.

The current worktree's persistent review site is **http://localhost:4324/**
(Node 24 container port 4321). Representative links: `/page/4/`, `/page/7/`,
`/category/c/`, `/category/c/page/5/`, `/tag/c/`, `/rss.xml`, `/feed/index.html`
and `/404.html`. The older phase-three server on port 4323 was not changed.
Phase 4 remains pending owner review. Phase 5 has been separately authorized;
its implementation and validation status are recorded below.

### Phase 5: static legacy comments

The owner explicitly authorized Phase 5 on 2026-10-25. The importer reads the
ignored local WordPress export, verifies all 62 approved post IDs and paths
against the completed Phase 3 manifest, and writes one JSON archive per post.
Only approved comments on those posts are exported. Archives contain the
approved display name, safe HTTP(S) website, SHA-256 Gravatar hash, original
comment date, sanitized HTML, and stable comment/parent IDs. Source email
addresses are normalized and hashed in memory only; embedded email addresses
are redacted. IPs, account metadata, unapproved comments, and comments on
unselected content are not written to public files.

Comment HTML is reduced to an explicit element/attribute allowlist. Active
elements and unsafe links are removed. Missing or excluded parents are rendered
as roots, and cycles are broken deterministically without dropping approved
replies or changing their archived parent IDs. Static comments render below
each post; no comment service or Giscus script is enabled.
Comments whose display name is exactly `PieEatingNinjas` are labeled with a
visible `author` badge; this presentation-only marker adds no identity data
to the archives.

Run in the Node 24 dev container with the private export under `_migration/`:

```sh
npm run test:comments
npm run migration:comments
npm run build
npm run migration:verify-comments
npm run astro -- dev --background
npm run astro -- dev status
```

Per-post output is `src/data/comments/<legacy-post-id>.json`; private
reconciliation and output ownership state stay under `_migration/comments/`.
The verification script checks the exact 196-comment inventory baseline,
per-post/rendered counts, every `#comment-<id>` anchor, allowed output fields,
safe markup, Gravatar hash shape, and email scans of `src/`, `public/`, and
`dist/`. Human review must still compare a nested thread and an orphan-handling
example with the local source. Phase 5 remains pending owner review; do not
start Phase 6 until it is explicitly accepted and separately authorized.

Validation on 2026-10-25:

- **196/196 approved comments** across **62/62 posts**; all 18 unapproved
  comments were excluded, with no approved comments outside the selected posts.
  No comments were dropped during rendering.
- **61 replies**, maximum thread depth **4**; the source has no missing-parent or
  cyclic relationships. Synthetic tests cover missing/excluded parents and
  cycle repair without dropping replies.
- The built output contains all **196** comment anchors, matching per-post
  archive and rendered counts. Output fields contain no IP/account metadata;
  privacy scans found zero email addresses in `src/`, `public/`, and `dist/`.
- `test:comments`: **6/6 passed**; `test:import`: **26/26 passed**;
  `test:migration`: **16/16 passed**. Astro check: **0 errors, 0 warnings**
  (four existing XML-validator deprecation hints). `npm run build`: **134
  static pages**, exit 0. The comment verifier passed.
- The existing post-output verifier could not run: its ignored
  `_migration/pilot/state.json` ownership file is absent in this worktree.
  The post-import regression tests and static build passed; the Phase 5
  comment importer uses its own ignored ownership state.
- Browser smoke check: the PDF-display post renders **27 comments** and
  working “In reply” links at
  [http://localhost:4321/2016/02/06/displaying-pdf-files-in-a-uwp-app/](http://localhost:4321/2016/02/06/displaying-pdf-files-in-a-uwp-app/).
  Synthetic orphan handling can be reviewed in
  [migration-comments.test.mjs](./scripts/migration-comments.test.mjs).
- A follow-up owner request labels the **40** comments named `PieEatingNinjas`
  with a visible `author` badge. The output verifier checks badge counts
  against the archived comments on every built post.

The owner accepted Phase 5 on 2026-10-25. Phase 6 is in progress. Phase 7 is
the planned whole-blog design phase; release readiness is Phase 8 and production
cutover is Phase 9.

### Phase 6: Giscus community discussions

Phase 5 has been accepted by the owner. Giscus is placed below each imported
post's static legacy comment archive. The owner approved adding it to the public
build on 2026-10-25. It is enabled by default in production builds and local
development; set `PUBLIC_GISCUS_ENABLED=false` to suppress the embed. If enabled
without complete configuration, the build fails with the missing fields.
Giscus appears above the archived WordPress comments, which are explicitly
labeled as legacy and read-only.

The owner has created the public Discussions repository and reports completing
the Giscus app installation. The repository's public visibility and enabled
Discussions feature were verified. The repository/category values were supplied
from the giscus.app configurator and are included in the public site config.

The public configuration is stored in `src/lib/giscus.ts`. The embed is enabled by
default; this build-time environment variable disables it:

```dotenv
PUBLIC_GISCUS_ENABLED=false
```

The embed uses `pathname` mapping with strict matching and searches only the
selected `Announcements` category. The repository and IDs are public website
configuration, not secrets. Run `npm run test:giscus` and `npm run build` to
verify the configured integration; use `PUBLIC_GISCUS_ENABLED=false` to test
the disabled state.

### GitHub Pages deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds the
static site with `withastro/action` (Node 24, npm) and publishes `dist/` to
GitHub Pages. It only runs on a manual trigger (`workflow_dispatch`): open
**Actions → Deploy to GitHub Pages → Run workflow**. It builds from committed
content only; `_migration/` is never required or uploaded.

One-time setup: in **Settings → Pages**, set **Source** to **GitHub Actions**.
The site is built for `https://blog.pieeatingninjas.be` at the domain root;
until the custom domain is configured (with `public/CNAME` and DNS, planned for
release readiness), the default `*.github.io/<repository>/` URL will not
resolve root-relative links and assets correctly.

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
