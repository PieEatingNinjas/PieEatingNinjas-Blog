# Phase 1 - Inventory evidence and proposed migration contract

Status: **implementation delivered; acceptance blocked**. No owner approval is
recorded. Do not begin Phase 2. The [plan](plan.md) remains authoritative;
the [migration report](../MIGRATION-REPORT.md) has not been rewritten to make
its counts agree with tooling.

## Changes and reproduction

- [Inventory tooling](../scripts/migration-inventory.mjs) reads the local WXR
  export, dated uploads, and migration report. It never reads WordPress
  configuration, PHP, plugins, themes, or database backups; never fetches
  media; and never imports into the application.
- [Synthetic tests](../scripts/migration-inventory.test.mjs) cover selection,
  privacy, hashes and threading, duplicate IDs/paths, missing images, image
  metadata, Jetpack/srcset/featured/linked references, excluded-only assets,
  encoded slugs, taxonomy separation, determinism, unsafe filesystem inputs,
  report parsing, and invalid CLI arguments.
- XML and HTML parsers are development dependencies. There is no new runtime
  service, collection, route, styling, or deployment configuration.
- The planning documents were brought forward from the existing planning
  branch by fast-forward, not recreated or reinterpreted.

Run from the repository root using Node 24:

```sh
npm run migration:inventory
npm run test:migration
npm run build
npm run migration:inventory -- --check
git check-ignore _migration/
git ls-files -- _migration
git diff --exit-code -- src public astro.config.mjs
git diff --check
```

Local outputs (intentionally ignored, not build inputs or artifacts):

- `../_migration/inventory/inventory.json`: IDs, selection/exclusion reasons,
  original dates/slugs, taxonomy membership, comments and parent IDs, attachment
  selection, references, image dimensions/frame counts/bytes/checksums, privacy
  finding locations, discrepancies, and diagnostics.
- `../_migration/inventory/expected-output.json`: proposed URL destinations
  and dispositions, query IDs, aliases, asset/reference coverage, all upload
  dispositions, external-image permission gate, and unverified plugin aliases.

Both files are JSON version 1, deterministically ordered, with source checksums
and no timestamps. Neither contains raw post/comment bodies or author identity
metadata. Comment email is hashed in memory as SHA-256 of trimmed lowercase
text; only the hash is retained. Other email occurrences are detected by
record ID/field, without values, and redacted if encountered in serialized data.
This audit is not a substitute for the importer's full privacy/sanitization
checks. Inputs and outputs resolving through symlinks are rejected. Upload
inspection is limited to files directly inside dated `YYYY/MM/` directories;
non-date backup/plugin directories and hidden files are not traversed.

## Reconciliation

| Record or baseline | Expected | Actual | Result |
|---|---:|---:|---|
| Published posts | 62 | 62 | Matched |
| Excluded draft posts | 5 | 5 | Matched |
| Selected pages | 4 | 4 | Matched; private About remains review-gated |
| Excluded placeholder pages | 2 | 2 | Matched |
| Approved comments, including pingbacks/trackbacks | 196 | 196 | Matched |
| Categories / tags | 44 / 7 | 44 / 7 | Matched, separate namespaces |
| Referenced unique originals | 125 | 125 | Exact file-set match, not just a count |
| Images / downloads | 121 / 4 | 121 / 4 | Matched |
| Code-only replacements | 11 | 11 | All listed originals present |
| Mixed code/UI / console originals | 8 / 8 | 8 / 8 | Retain visual media |
| Optimization cases | 20 | 20 | All have measured source metadata |
| Variants of selected originals | 424 | 487 | Unresolved difference of 63 |
| Unused originals | 74 | 78 physical files | Report's 74 plus four excluded-content-only files |

All inventoried record types balance included plus excluded:

| Record type | Total | Included | Excluded |
|---|---:|---:|---:|
| WXR items | 274 | 66 selected post/page records | 208 |
| Posts | 67 | 62 | 5 |
| Pages | 6 | 4 | 2 |
| Comments | 214 | 196 | 18 unapproved |
| Attachment records, selected independently by reference | 199 | 125 | 74 |
| Taxonomy definitions | 51 | 51 | 0 |
| Dated physical upload files | 992 | 612 candidates | 380 |

"Included" uploads are inventory candidates, **not approval to copy 612 files**.
They comprise 125 originals and 487 variants requiring compatibility decisions.
The 380 exclusions comprise 78 physical originals and 302 variants.
The report's 74 unused paths all exist and are unreferenced by selected content.
The four additional originals are referenced only by excluded drafts; their
paths and originating record IDs are listed locally. Attachment-record counts
and physical-original counts are different sets: four old/pre-scaled originals
exist on disk without their own unused attachment record.

The 487 variant count is derived independently from local files and attachment
size metadata, with a dimension-suffix fallback only when the original exists.
All 487 have dimension-suffixed filenames. Of these, 46 belong to the 11
code-replacement originals; that does **not** explain the difference of 63.
The report's 424 must be reconciled or explicitly corrected by the owner.

Coverage on the restored inputs:

- 66/66 selected content URLs and 160/160 local asset reference occurrences
  are covered. The references contain 143 distinct local paths.
- One external image is recorded separately, without fetching it.
- 1,468 URL entries cover dated posts, pages, taxonomy archives, proposed
  pagination, query IDs, comment anchors, original uploads, image aliases,
  discovered slug/date aliases, and attachment landing/query URLs.
- No missing selected originals/referenced files, duplicate record IDs or
  selected permalink paths, unreadable selected images, undefined taxonomies,
  or invalid comment-parent relationships were found.
- The 196 approved comments comprise 156 comments, 39 pingbacks, and one
  trackback. None is silently dropped because of its type.
- One selected post has an email occurrence in its body. Its ID/field, not the
  value or text, is recorded locally; sanitization and owner review are required.
- One approved comment has a website that fails the safe HTTP(S) URL policy.
  Only its comment ID and proposed omission are recorded; no unsafe value is
  persisted. Review this disposition before import.
- The plugin redirect list is absent. Unknown aliases are explicitly
  **unverified**, not claimed to be covered.

## Proposed schemas (not applied to Astro yet)

Use build-time content collections and clean Markdown, not MDX for imported
WordPress HTML. This follows Astro's
[content collection guidance](https://docs.astro.build/en/guides/content-collections/).

### Posts and selected pages

Post frontmatter:

| Field | Proposed type / invariant |
|---|---|
| `legacyId` | Positive integer, globally unique WordPress ID |
| `legacyPath` | Exact `/YYYY/MM/DD/slug/`, unique and trailing-slashed |
| `legacySlug` | Original encoded slug; no regeneration from title |
| `title` | Required, privacy-reviewed text |
| `description` | Required, privacy-reviewed SEO description or plain-text excerpt; never silently empty |
| `pubDate` | `YYYY-MM-DD` from the permalink; validate as a real calendar date |
| `updatedDate` | Optional reviewed local modification calendar date |
| `categories` | Array of original category slugs |
| `tags` | Separate array of original tag slugs |
| `heroImage` | Optional approved local upload/derivative path string |

Preserve local and GMT timestamps in the private inventory for audit. Do not
derive routing dates by converting a GMT timestamp to the machine timezone.
Convert calendar dates consistently for the template's display without shifting
their day. Unknown/malformed dates or duplicate IDs/paths block import.

Selected pages use equivalent legacy identity/description data and explicit
destinations: About `/about/`, Book `/book/`, Privacy Policy `/privacy-policy/`,
and 404 `/404.html`. The old
`/404-error-content-does-not-exist-anymore/` is a separately mapped alias to
the genuine error page; it must not make arbitrary missing pages return 200.
Home and Blog placeholder bodies are excluded; redirecting their old paths to
`/` remains a proposed URL disposition.

Taxonomies retain `{ id, taxonomy, slug, name, parentSlug }` and distinct
category/tag memberships. Do not flatten categories into tags.

### Static comments and public maps

Per-post JSON: `{ postId, comments: [{ id, parentId, type, name, website,
gravatarHash, date, content }] }`.

- `name` is intended public display text, `website` is an optional validated
  HTTP(S) URL without credentials or private parameters, and `gravatarHash` is
  nullable SHA-256. No emails, IPs, WordPress user/account fields, or raw metadata.
- `content` is sanitized HTML. Proposed allowlist: `p`, `br`, `a`, `em`,
  `strong`, `code`, `pre`, `blockquote`, `ul`, `ol`, `li`; link attributes limited
  to safe `href` and `title`. Strip scripts, embeds, event handlers, executable
  schemes, and unsafe attributes; audit text and links for personal data too.
- Stable integer IDs/parent IDs preserve threads and `#comment-ID` anchors.
  Missing/excluded parents and cycles must be reported and explicitly resolved
  (for example, a reviewed promotion to the root), never lose approved entries.
- Approved pingbacks/trackbacks remain typed archive entries, not discarded.
- Proposed public ID map: separate `posts` and `pages` dictionaries from numeric
  IDs to known local destinations. No drafts, attachment IDs, private content
  outside the About exception, arbitrary URLs, or raw WXR fields.
- Proposed alias map: `{ source, destination, kind }` for approved local paths
  only. Query-ID handling is separate; static Astro redirects are HTML
  navigation documents, not HTTP 301s and not image bytes.

### Manifest and asset dispositions

Each manifest URL carries `{ source, destination, kind, disposition, approval }`.
Null destinations and any non-`not-required` approval are explicitly unresolved.
Asset records retain source path/checksum, dimensions, frame count and byte size;
reference records retain WordPress ID, context, original mapping and existence.
Every dated physical file has a retain/rewrite/alias/omit **proposal**, with
exclusion reasons and excluded-content references where applicable.

Normal images keep `/wp-content/uploads/YYYY/MM/...`. Rewrite embedded resized
and Jetpack URLs consistently to approved originals or optimized derivatives.
Propose byte-serving file aliases for the 487 old variant paths and compatibility
files for the 11 code-image originals; do not use HTML redirects for these URLs.
Owner approval is needed because this extends the report's original-only copy
policy. Code screenshots become reviewed language-tagged fences in article
content, even if old image bytes are retained separately for compatibility.
Unreferenced/draft-only files are proposed omissions, not automatically approved.
Historical URLs outside the available export/dump/plugin list remain unknown.

Proposed optimization budgets: maximum still-image width 1,600 px and maximum
500,000 bytes per served derivative; use narrower widths where appropriate
(book cover about 800 px, ordinary screenshots about 1,440 px). Animated WebP
must retain animation, aspect ratio, and meaningful frames/timing; propose a
500,000-byte derivative budget and about 600 px width for the large GridView
animation. If a budget cannot be met legibly, report and review an exception;
never silently flatten animation or discard content. Compatibility originals
can exceed these budgets only with explicit approval. No transformations have
been performed in Phase 1.

## Redacted decision and exclusion register

All entries below are proposals or blocked decisions, not owner approvals.

| Topic | Proposed contract / required action |
|---|---|
| Pagination | 10 posts/page, descending legacy date with stable ID tie-break; `/`, `/page/N/`; `/page/1/` redirects to `/`. Taxonomy continuations at `/category/slug/page/N/` and `/tag/slug/page/N/`, matching first-page aliases. Retain empty term landing pages with an empty state, no fake post or extra pages. The manifest reflects this proposal, not verified historical page counts. |
| Dates/slugs | Preserve exact permalink spelling, encoded slugs, date and trailing slash. Review old-slug/date aliases, especially when historical date and current date may differ. |
| Unsupported conversions | Convert only confirmed caption/video shortcodes outside code. Candidate `[x]`, `[path]`, `[time]` matches need review, not blind stripping. Preserve code verbatim. Map `c#`/`csharp` to `csharp`, `xhtml`/`xml` to `xml`, `ps` to `powershell`, `vbnet` to `vb`, and known other languages explicitly. `generic`, `default`, and missing languages require block-level review, not guessing from the topic. Inventory records identify affected entries. |
| Missing assets | None currently selected are missing. Any future missing file is a blocking diagnostic, not a remote download or placeholder fallback. |
| Giscus | Confirmed interpretation of the plan: below the static legacy comment archive on each post. Disabled until public-repository/configuration gates are met. Not below the home archive and not a replacement for existing comments. |
| Variant discrepancy | Reconcile 424 reported versus 487 found. Accepting the actual count or narrowing compatibility requires owner review; the baseline stays unchanged. |
| Unused/draft-only originals | Review the 74 listed unused paths plus four additional excluded-draft-only physical originals. All remain omission proposals. Shared assets used by selected content remain selected. |
| Image compatibility/budgets | Approve per-file alias/compatibility exceptions and the above derivative budgets. All 11 code replacements need visual/source review later; all 20 optimization cases have measured inputs. |
| Plugin redirects | Supply an owner-sanitized `eps-301-redirects` export/admin list. Do not read credentials or raw DB backups. Complete alias reconciliation is blocked until it is supplied or explicitly scoped out. |
| Attachment landing pages | All 199 attachment URLs and their query forms are inventoried. Approve redirect/omission destinations; do not silently turn unused attachment pages into post imports or arbitrary redirects. |
| External image | The single `pbs.twimg.com` reference is permission/privacy-gated. Obtain reuse permission and approved destination or an explicit omission before downloading. |
| Two MP4s | Keep legacy download paths if redistribution is approved. No new video service or playback redesign. |
| Two third-party PDFs | Prefer verified authoritative external links. Owner must provide/approve source URLs and old-local-URL dispositions; no redistribution or invented replacement URL yet. |
| About | Explicitly approve a sanitized version of the selected private page before publishing. Optional author photos stay omitted unless specifically approved. This exception never extends to other private records. |
| Book | Empty WXR body. Owner supplies or approves reconstruction source/copy for *The MVVM Pattern in .NET MAUI*; do not invent book claims. |
| Privacy Policy | Owner approves copy reflecting static GitHub Pages, static comments, optional Gravatar/Giscus, and actual service choices. Do not carry over obsolete WordPress/ads/analytics claims. |
| SEO descriptions | Review existing SEO description candidates and privacy-safe excerpts before import. Inventory stores presence, not raw plugin metadata. |
| Search Console | Propose preserving the existing HTML verification file rather than changing DNS during this phase. Owner selects HTML-file or DNS verification; no token has been copied or logged. |
| AdSense / `ads.txt` | Absent unless retention is explicitly approved. Do not copy the publisher line automatically. |
| Analytics / redesign | Remain outside approved scope; no analytics, branding, header, favicon, or template styling changes. |

Exclude WordPress infrastructure, credentials, backups, private/protected content
except the explicit About proposal, five drafts and draft-only assets, two
placeholder bodies, and 18 unapproved comments. Keep all actual exclusion
records with reasons in the private inventory. About publication, photo reuse,
download redistribution, and plugin aliases are not inferred from silence.

## Validation and acceptance boundary

Validation uses the Node 24 dev-container image because Node/npm are not
installed on the host. The normal VS Code dev container commands above are
equivalent. Standalone container invocations mount this worktree at its absolute
path and the main checkout at its absolute path read-only, so Git can resolve
the worktree metadata for ignore checks. No input is sent to an external service.

| Validation | Exit / evidence |
|---|---|
| `npm run test:migration` | 0; 16 synthetic tests pass |
| `npm run build` | 0; unchanged template generates eight pages |
| `npm run migration:inventory` twice | 0 each; both JSON outputs byte-identical by SHA-256 comparison |
| `npm run migration:inventory -- --check` | 1 expected; pending baseline/privacy/approval checks block acceptance |
| `git check-ignore _migration/` | 0 |
| `git ls-files -- _migration` | 0, empty output |
| `git diff --exit-code -- src public astro.config.mjs` | 0; no post/asset import or site changes |
| `git diff --check` | 0 |
| Local email-pattern audit | 0 findings in application source, public assets, build output, and generated inventory JSON; no migration input paths in build output |

Human review checkboxes in the plan remain unchecked. The count differences,
privacy remediation, image compatibility decisions, missing plugin mapping,
and open page/service/reuse decisions prevent phase acceptance. After the
owner resolves them, rerun inventory and review representative posts, pages,
taxonomies, comment threads and each image mapping type. Do not interpret a
successful generation command or this handoff as acceptance or permission
to begin Phase 2.
