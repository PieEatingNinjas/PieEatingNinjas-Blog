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
