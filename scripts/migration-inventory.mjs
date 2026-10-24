import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile, realpath, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import sharp from 'sharp';

const ORIGIN = 'https://blog.pieeatingninjas.be';
const UPLOADS = '/wp-content/uploads/';
const EMAIL = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const SELECTED_PAGES = new Map([
	['about', '/about/'],
	['book', '/book/'],
	['privacy-policy', '/privacy-policy/'],
	['404-error-content-does-not-exist-anymore', '/404.html'],
]);
export const EXPECTED = {
	posts: 62, drafts: 5, pages: 4, placeholders: 2, comments: 196,
	categories: 44, tags: 7, originals: 125, images: 121, downloads: 4,
	codeImages: 11, optimizationCases: 20, usedVariants: 424, unusedOriginals: 74,
};
const array = (value) => value === undefined ? [] : Array.isArray(value) ? value : [value];
const text = (value) => String(value?.['#text'] ?? value ?? '');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const sortBy = (key) => (a, b) => String(a[key]).localeCompare(String(b[key]), 'en');
const hasEmail = (value) => new RegExp(EMAIL).test(value);
const isImage = (file) => /\.(?:png|jpe?g|gif|webp|avif|svg|bmp|tiff?)$/i.test(file);
const isVariant = (file) => /-\d+x\d+(?=\.[^.]+$)/.test(file);
const unique = (values) => [...new Set(values)].sort();

class InventoryError extends Error {}

function fail(message) {
	throw new InventoryError(message);
}

function integer(value, label) {
	const string = text(value);
	if (!/^\d+$/.test(string) || !Number.isSafeInteger(Number(string))) fail(`Invalid ${label}.`);
	return Number(string);
}

function safeUrl(value) {
	if (hasEmail(value)) return null;
	let url;
	try {
		url = new URL(value, ORIGIN);
	} catch {
		return null;
	}
	if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
	try {
		if (hasEmail(decodeURIComponent(url.href))) return null;
	} catch {
		return null;
	}
	if ([...url.searchParams.keys()].some((key) => /email|token|secret|password|auth|key/i.test(key))) return null;
	return url;
}

function localUrl(value) {
	const url = safeUrl(value);
	if (!url || url.hostname !== new URL(ORIGIN).hostname) return null;
	return `${url.pathname}${url.search}${url.hash}`;
}

export function uploadPath(value) {
	const url = safeUrl(value);
	if (!url) return null;
	let pathname = url.pathname;
	if (/^i\d\.wp\.com$/.test(url.hostname)) {
		const prefix = `/${new URL(ORIGIN).hostname}`;
		if (!pathname.startsWith(`${prefix}${UPLOADS}`)) return null;
		pathname = pathname.slice(prefix.length);
	} else if (url.hostname !== new URL(ORIGIN).hostname) {
		return null;
	}
	if (!pathname.startsWith(UPLOADS)) return null;
	let relative;
	try {
		relative = decodeURIComponent(pathname.slice(UPLOADS.length));
	} catch {
		fail('Invalid encoding in an upload URL.');
	}
	if (!/^\d{4}\/\d{2}\/[^/]+$/.test(relative) || relative.includes('\\') || /[\u0000-\u001f]/.test(relative)) {
		fail('Unsafe or unsupported upload path.');
	}
	return relative;
}

export function parseExport(xml) {
	if (/<!DOCTYPE|<!ENTITY/i.test(xml)) fail('XML declarations with entities/DOCTYPE are not supported.');
	if (XMLValidator.validate(xml) !== true) fail('Invalid WordPress XML; validate the local export.');
	const parsed = new XMLParser({
		ignoreAttributes: false,
		parseTagValue: false,
		parseAttributeValue: false,
		trimValues: false,
		processEntities: true,
	}).parse(xml);
	const channel = parsed.rss?.channel;
	if (!channel || text(channel['wp:wxr_version']).trim() !== '1.2') fail('Expected a WordPress WXR 1.2 export.');
	return channel;
}

export function reportBaseline(report) {
	const section = (start, end) => {
		const from = report.indexOf(start);
		const to = report.indexOf(end, from + start.length);
		if (from < 0 || to < 0) fail('Migration report sections are missing; review the baseline format.');
		return report.slice(from, to);
	};
	const paths = (value) => unique([...value.matchAll(/`(\d{4}\/\d{2}\/[^`]+)`/g)].map((match) => match[1]));
	const assets = section('## 3. Assets to migrate, per post', '### Posts without any local asset');
	const code = section('### 🔴 Code as image', '### 🟠 Code mixed');
	const optimized = section('## 3b.', '## 4.');
	return {
		originals: paths(assets),
		codeImages: unique(code.split('\n').filter((line) => line.startsWith('| ') && /`\d{4}\//.test(line))
			.map((line) => line.split('|')[2].match(/`([^`]+)`/)[1])),
		optimization: unique(optimized.slice(0, optimized.indexOf('Borderline')).split('\n')
			.filter((line) => line.startsWith('| `'))
			.map((line) => line.match(/`([^`]+)`/)[1])),
		unused: paths(section('### Uploads that are not needed', '## 7.')),
		mixed: paths(section('### 🟠 Code mixed', '### 🟢 Console')).filter((file) => !isVariant(file)),
		console: paths(section('### 🟢 Console', 'Not flagged on purpose')),
	};
}

function metadata(item) {
	const result = new Map();
	for (const entry of array(item['wp:postmeta'])) {
		const key = text(entry['wp:meta_key']);
		if (!result.has(key)) result.set(key, []);
		result.get(key).push(text(entry['wp:meta_value']));
	}
	return result;
}

export function classify(item) {
	const type = text(item['wp:post_type']);
	const status = text(item['wp:status']);
	const slug = text(item['wp:post_name']);
	if (text(item['wp:post_password'])) return { included: false, reason: 'password-protected' };
	if (type === 'post') return status === 'publish'
		? { included: true, reason: 'published-post' }
		: { included: false, reason: `${status || 'unknown'}-post` };
	if (type === 'page') {
		if (['home', 'blog'].includes(slug)) return { included: false, reason: 'placeholder-page' };
		if (SELECTED_PAGES.has(slug) && (status === 'publish' || (slug === 'about' && status === 'private'))) {
			return { included: true, reason: slug === 'about' ? 'private-about-review-required' : 'selected-page' };
		}
		return { included: false, reason: `${status || 'unknown'}-page` };
	}
	if (type === 'attachment') return { included: false, reason: 'attachment-selected-by-reference-only' };
	return { included: false, reason: 'wordpress-infrastructure' };
}

function inspectMarkup(html) {
	const $ = load(html, { xml: false }, false);
	const references = [];
	const links = [];
	for (const element of $('*').toArray()) {
		const tag = element.tagName;
		for (const attr of ['src', 'href', 'poster', 'data-src']) {
			const value = $(element).attr(attr);
			if (!value) continue;
			if (uploadPath(value)) references.push({ url: value, context: `${tag}:${attr}` });
			if (attr === 'href') links.push(value);
			if (['img', 'source'].includes(tag) && attr === 'src' && !uploadPath(value)) {
				references.push({ url: value, context: 'external-image' });
			}
		}
		for (const candidate of ($(element).attr('srcset') ?? '').split(',')) {
			const value = candidate.trim().split(/\s+/)[0];
			if (value) references.push({ url: value, context: 'srcset' });
		}
	}
	for (const match of html.matchAll(/\[(?:video|audio)\b[^\]]*?\b(?:src|mp4|webm|ogg)=["']([^"']+)["'][^\]]*\]/g)) {
		references.push({ url: match[1], context: 'media-shortcode' });
	}
	const codeLanguages = unique($('pre').toArray().map((element) => {
		const explicit = $(element).attr('data-enlighter-language');
		const legacy = ($(element).attr('class') ?? '').match(/(?:lang:|language-)([^\s;]+)/)?.[1];
		return explicit ?? legacy ?? 'unknown';
	}));
	const withoutCode = $.root().clone();
	withoutCode.find('pre, code').remove();
	const shortcodes = unique([...withoutCode.text().matchAll(/\[(\/?)([a-z][a-z0-9_-]*)(?:\s[^\]]*|\/)?\]/gi)]
		.map((match) => match[2].toLowerCase()));
	return { references, links, codeLanguages, shortcodes, empty: !$.text().trim() && !$('img,video').length };
}

async function walkUploads(root) {
	const files = [];
	async function visit(directory, prefix = '') {
		for (const entry of (await readdir(directory, { withFileTypes: true })).sort(sortBy('name'))) {
			if (entry.name.startsWith('.')) continue;
			const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (entry.isSymbolicLink()) fail('Symlinks are not permitted in the uploads input.');
			if (entry.isDirectory()) {
				if (!prefix && !/^\d{4}$/.test(entry.name)) continue;
				if (/^\d{4}$/.test(prefix) && !/^\d{2}$/.test(entry.name)) continue;
				if (/^\d{4}\/\d{2}$/.test(prefix)) continue;
				await visit(path.join(directory, entry.name), relative);
			}
			else if (entry.isFile() && /^\d{4}\/\d{2}$/.test(prefix)) files.push(relative);
		}
	}
	await visit(root);
	return files.sort();
}

function tally(records) {
	const included = records.filter((record) => record.included).length;
	return { total: records.length, included, excluded: records.length - included };
}

function threadIssues(comments, issues) {
	const byId = new Map(comments.map((comment) => [comment.id, comment]));
	for (const comment of comments.filter((entry) => entry.included && entry.parentId)) {
		const seen = new Set([comment.id]);
		let parentId = comment.parentId;
		while (parentId) {
			const parent = byId.get(parentId);
			if (!parent || !parent.included || parent.postId !== comment.postId) {
				issues.push({ code: 'comment-parent-unavailable', id: comment.id, parentId });
				break;
			}
			if (seen.has(parentId)) {
				issues.push({ code: 'comment-parent-cycle', id: comment.id });
				break;
			}
			seen.add(parentId);
			parentId = parent.parentId;
		}
	}
}

export async function createInventory({ xml, uploadsRoot, baseline, reportHash = null }) {
	const channel = parseExport(xml);
	const items = array(channel.item);
	const files = await walkUploads(uploadsRoot);
	const fileSet = new Set(files);
	const issues = [];
	const privacy = [];
	const records = [];
	const comments = [];
	const attachments = [];
	const references = [];
	const excludedAssetUses = new Map();
	const internalLinks = [];
	const manifest = new Map();
	const attachmentOriginal = new Map();
	const originalByFile = new Map();
	const addUrl = (source, destination, kind, disposition, approval = 'not-required') => {
		if (!source) {
			issues.push({ code: 'invalid-legacy-url', kind });
			return;
		}
		if (!manifest.has(source)) manifest.set(source, { source, destination, kind, disposition, approval });
		else if (manifest.get(source).destination !== destination) {
			issues.push({ code: 'conflicting-url-destination', source });
		}
	};

	for (const item of items) {
		if (text(item['wp:post_type']) !== 'attachment') continue;
		const id = integer(item['wp:post_id'], 'attachment ID');
		const meta = metadata(item);
		const original = meta.get('_wp_attached_file')?.[0] ?? uploadPath(text(item['wp:attachment_url']));
		if (!original || !uploadPath(`${ORIGIN}${UPLOADS}${original}`)) {
			issues.push({ code: 'attachment-path-unavailable', id });
			continue;
		}
		attachmentOriginal.set(id, original);
		originalByFile.set(original, original);
		const serialized = meta.get('_wp_attachment_metadata')?.[0] ?? '';
		for (const match of serialized.matchAll(/s:4:"file";s:\d+:"([^"]+)";/g)) {
			const candidate = match[1].includes('/') ? match[1] : `${path.posix.dirname(original)}/${match[1]}`;
			if (uploadPath(`${ORIGIN}${UPLOADS}${candidate}`)) originalByFile.set(candidate, original);
		}
		attachments.push({ id, original, localExists: fileSet.has(original), legacyUrl: localUrl(text(item.link)) });
	}
	for (const file of files) {
		if (!originalByFile.has(file) && isVariant(file)) {
			const original = file.replace(/-\d+x\d+(?=\.[^.]+$)/, '');
			if (fileSet.has(original)) originalByFile.set(file, original);
		}
	}

	const seenIds = new Set();
	const seenPaths = new Set();
	for (const item of items) {
		const id = integer(item['wp:post_id'], 'post ID');
		if (seenIds.has(id)) issues.push({ code: 'duplicate-wordpress-id', id });
		seenIds.add(id);
		const type = text(item['wp:post_type']);
		const status = text(item['wp:status']);
		const selection = classify(item);
		const record = { id, type, status, ...selection };
		const meta = metadata(item);
		if (!selection.included && ['post', 'page'].includes(type)) {
			const excludedReferences = inspectMarkup(text(item['content:encoded'])).references;
			const featured = meta.get('_thumbnail_id')?.[0];
			const featuredPath = featured ? attachmentOriginal.get(integer(featured, 'excluded featured ID')) : null;
			if (featuredPath) excludedReferences.push({ url: `${ORIGIN}${UPLOADS}${featuredPath}` });
			for (const reference of excludedReferences) {
				const relative = uploadPath(reference.url);
				if (!relative) continue;
				const original = originalByFile.get(relative) ?? relative;
				if (!excludedAssetUses.has(original)) excludedAssetUses.set(original, []);
				excludedAssetUses.get(original).push({ id, reason: selection.reason });
			}
		}
		if (selection.included) {
			const legacyUrl = localUrl(text(item.link));
			const slug = text(item['wp:post_name']);
			const destination = type === 'page' ? SELECTED_PAGES.get(slug) : legacyUrl;
			if (seenPaths.has(legacyUrl)) issues.push({ code: 'duplicate-legacy-path', id, source: legacyUrl });
			seenPaths.add(legacyUrl);
			if (type === 'post' && !/^\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/$/.test(legacyUrl ?? '')) {
				issues.push({ code: 'invalid-dated-permalink', id });
			}
			const html = text(item['content:encoded']);
			const markup = inspectMarkup(html);
			const terms = array(item.category).map((term) => ({
				taxonomy: text(term['@_domain']), slug: text(term['@_nicename']),
			})).sort(sortBy('slug'));
			Object.assign(record, {
				legacyUrl, destination, slug, localDate: text(item['wp:post_date']),
				gmtDate: text(item['wp:post_date_gmt']), modifiedLocal: text(item['wp:post_modified']),
				terms, codeLanguages: markup.codeLanguages, shortcodes: markup.shortcodes,
				emptyBody: markup.empty,
				hasSeoDescription: Boolean(meta.get('_metaseo_metadesc')?.some((value) => value.trim())),
			});
			if (type === 'post') record.permalinkDate = legacyUrl?.slice(1, 11).replaceAll('/', '-');
			addUrl(legacyUrl, destination, type, type === 'post' ? 'retain' : 'page', type === 'page' ? 'pending' : 'not-required');
			addUrl(`/?${type === 'post' ? 'p' : 'page_id'}=${id}`, destination, 'query-id', 'client-id-map');
			const featured = meta.get('_thumbnail_id')?.[0];
			if (featured) {
				const original = attachmentOriginal.get(integer(featured, 'featured attachment ID'));
				if (original) markup.references.push({ url: `${ORIGIN}${UPLOADS}${original}`, context: 'featured' });
				else issues.push({ code: 'featured-attachment-unavailable', id });
			}
			for (const reference of markup.references) references.push({ postId: id, ...reference });
			for (const value of markup.links) {
				const source = localUrl(value);
				if (source && !uploadPath(value)) internalLinks.push({ postId: id, source });
			}
			for (const oldSlug of meta.get('_wp_old_slug') ?? []) {
				if (type !== 'post' || !oldSlug || hasEmail(oldSlug)) continue;
				const source = legacyUrl?.replace(/[^/]+\/$/, `${oldSlug}/`);
				addUrl(source, destination, 'old-slug', 'html-redirect', 'pending-date-verification');
			}
			for (const oldDate of meta.get('_wp_old_date') ?? []) {
				if (!/^\d{4}-\d{2}-\d{2}$/.test(oldDate)) {
					issues.push({ code: 'invalid-old-date', id });
					continue;
				}
				addUrl(`/${oldDate.replaceAll('-', '/')}/${slug}/`, destination, 'old-date', 'html-redirect', 'pending');
			}
		} else if (selection.reason === 'placeholder-page') {
			addUrl(localUrl(text(item.link)), '/', 'placeholder-page', 'html-redirect', 'pending');
		}
		if (type === 'attachment') {
			addUrl(localUrl(text(item.link)), null, 'attachment-page', 'owner-disposition-required', 'pending');
			addUrl(`/?attachment_id=${id}`, null, 'attachment-query', 'owner-disposition-required', 'pending');
		}
		records.push(record);
		for (const comment of array(item['wp:comment'])) {
			const commentId = integer(comment['wp:comment_id'], 'comment ID');
			const approved = text(comment['wp:comment_approved']) === '1';
			const included = approved && selection.included;
			const entry = {
				id: commentId, postId: id, parentId: integer(comment['wp:comment_parent'] ?? '0', 'comment parent'),
				included, reason: included ? 'approved-selected-content' : approved ? 'excluded-content' : 'not-approved',
				type: text(comment['wp:comment_type']) || 'comment',
			};
			if (included) {
				const email = text(comment['wp:comment_author_email']).trim().toLowerCase();
				const website = text(comment['wp:comment_author_url']);
				const safeWebsite = /^https?:\/\//i.test(website) ? safeUrl(website) : null;
				if (website && !safeWebsite) issues.push({ code: 'comment-website-review-required', id: commentId });
				Object.assign(entry, {
					date: text(comment['wp:comment_date']), gmtDate: text(comment['wp:comment_date_gmt']),
					gravatarHash: email ? digest(email) : null,
					website: safeWebsite?.href ?? null,
					websiteDisposition: !website ? 'absent' : safeWebsite ? 'safe-http-url' : 'omit-unsafe-url-proposed',
					htmlSanitizationRequired: true,
				});
				for (const field of ['wp:comment_content', 'wp:comment_author', 'wp:comment_author_url']) {
					if (hasEmail(text(comment[field]))) privacy.push({ record: 'comment', id: commentId, field, action: 'redact-before-import' });
				}
				addUrl(`${record.legacyUrl}#comment-${commentId}`, `${record.destination}#comment-${commentId}`, 'comment-anchor', 'retain');
			}
			comments.push(entry);
		}
		if (selection.included) {
			for (const [field, value] of Object.entries(item)) {
				if (field.startsWith('wp:comment') || field === 'dc:creator') continue;
				if (hasEmail(JSON.stringify(value))) privacy.push({ record: type, id, field, action: 'redact-before-import' });
			}
		}
	}
	const commentIds = new Set();
	for (const comment of comments) {
		if (commentIds.has(comment.id)) issues.push({ code: 'duplicate-comment-id', id: comment.id });
		commentIds.add(comment.id);
	}
	threadIssues(comments, issues);

	const taxonomies = [];
	for (const [element, taxonomy, slugField, nameField] of [
		['wp:category', 'category', 'wp:category_nicename', 'wp:cat_name'],
		['wp:tag', 'post_tag', 'wp:tag_slug', 'wp:tag_name'],
	]) {
		const seen = new Set();
		const termIds = new Set();
		for (const term of array(channel[element])) {
			const slug = text(term[slugField]);
			const id = integer(term['wp:term_id'], 'term ID');
			const source = `/${taxonomy === 'category' ? 'category' : 'tag'}/${slug}/`;
			if (seen.has(slug)) issues.push({ code: 'duplicate-taxonomy-slug', taxonomy, slug });
			if (termIds.has(id)) issues.push({ code: 'duplicate-taxonomy-id', taxonomy, id });
			seen.add(slug);
			termIds.add(id);
			taxonomies.push({
				id, taxonomy, slug, name: text(term[nameField]),
				parentSlug: text(term['wp:category_parent']), legacyUrl: source,
				included: true, reason: 'retain-distinct-taxonomy',
			});
			addUrl(source, source, 'taxonomy', 'retain');
			const members = records.filter((record) => record.included && record.type === 'post'
				&& record.terms.some((entry) => entry.taxonomy === taxonomy && entry.slug === slug));
			for (let page = 2; page <= Math.ceil(members.length / 10); page++) {
				addUrl(`${source}page/${page}/`, `${source}page/${page}/`, 'taxonomy-pagination', 'retain', 'pending-page-size');
			}
			addUrl(`${source}page/1/`, source, 'taxonomy-first-page', 'html-redirect', 'pending');
		}
	}
	for (const record of records.filter((entry) => entry.included)) {
		for (const term of record.terms) {
			if (!taxonomies.some((entry) => entry.taxonomy === term.taxonomy && entry.slug === term.slug)) {
				issues.push({ code: 'undefined-taxonomy-membership', id: record.id, ...term });
			}
		}
	}
	addUrl('/', '/', 'archive', 'retain');
	addUrl('/page/1/', '/', 'archive-first-page', 'html-redirect', 'pending');
	addUrl('/rss.xml', '/rss.xml', 'feed', 'generate-xml');
	addUrl('/feed/', '/feed/', 'feed', 'byte-identical-xml');
	addUrl('/404.html', '/404.html', 'not-found', 'generate-404');
	const postCount = records.filter((entry) => entry.type === 'post' && entry.included).length;
	for (let page = 2; page <= Math.ceil(postCount / 10); page++) {
		addUrl(`/page/${page}/`, `/page/${page}/`, 'archive-pagination', 'retain', 'pending-page-size');
	}

	const uses = [];
	const externalImages = [];
	for (const reference of references) {
		const relative = uploadPath(reference.url);
		if (!relative) {
			const url = safeUrl(reference.url);
			if (url) externalImages.push({ postId: reference.postId, context: reference.context, url: url.href, disposition: 'permission-required-before-fetch' });
			else issues.push({ code: 'unsafe-image-reference', postId: reference.postId, context: reference.context });
			continue;
		}
		const original = originalByFile.get(relative) ?? relative;
		uses.push({
			postId: reference.postId, context: reference.context,
			source: `${UPLOADS}${relative}`, original, localExists: fileSet.has(relative),
			originalExists: fileSet.has(original),
		});
	}
	const usedOriginals = unique(uses.map((entry) => entry.original));
	const usedOriginalSet = new Set(usedOriginals);
	const codeSet = new Set(baseline.codeImages);
	const optimizationSet = new Set(baseline.optimization);
	const assets = [];
	for (const original of usedOriginals) {
		const localExists = fileSet.has(original);
		const image = isImage(original);
		const code = codeSet.has(original);
		const pdf = /\.pdf$/i.test(original);
		const optimize = optimizationSet.has(original);
		const disposition = code ? 'fenced-code-replacement' : pdf ? 'external-authoritative-link-proposed'
			: optimize ? 'optimized-derivative-proposed' : 'retain-original';
		const asset = {
			original, kind: image ? 'image' : 'download', localExists, disposition,
			publicPath: `${UPLOADS}${original}`, approval: code || pdf || optimize ? 'pending' : 'not-required',
			postIds: unique(uses.filter((entry) => entry.original === original).map((entry) => entry.postId)),
			contexts: unique(uses.filter((entry) => entry.original === original).map((entry) => entry.context)),
			visualRole: baseline.mixed.includes(original) ? 'mixed-code-ui'
				: baseline.console.includes(original) ? 'console-output' : code ? 'code-only' : 'other',
			optimizationRequired: optimize,
		};
		if (localExists) {
			const bytes = await readFile(path.join(uploadsRoot, original));
			Object.assign(asset, { bytes: bytes.length, sha256: digest(bytes) });
			if (image) {
				let info;
				try {
					info = await sharp(bytes).metadata();
				} catch {
					issues.push({ code: 'image-metadata-unreadable', path: original });
				}
				if (info) Object.assign(asset, {
					width: info.width, height: info.pageHeight ?? info.height, frames: info.pages ?? 1,
					format: info.format,
				});
			}
		} else issues.push({ code: 'missing-original', path: original });
		assets.push(asset);
		addUrl(asset.publicPath, pdf ? null : asset.publicPath, 'upload-original', disposition, asset.approval);
	}
	for (const use of uses) {
		if (!use.localExists) issues.push({ code: 'missing-referenced-file', path: use.source, postId: use.postId });
		if (use.source !== `${UPLOADS}${use.original}`) {
			addUrl(use.source, use.source, 'referenced-image-alias', 'retain-file-alias-proposed', 'pending');
		}
	}
	for (const link of internalLinks) {
		if (!manifest.has(link.source) && !manifest.has(link.source.split('#')[0])) {
			addUrl(link.source, null, 'internal-link', 'owner-disposition-required', 'pending');
		}
	}
	const uploadFiles = files.map((file) => {
		const original = originalByFile.get(file) ?? file;
		const used = usedOriginalSet.has(original);
		const variant = file !== original;
		const excludedUses = excludedAssetUses.get(original) ?? [];
		const disposition = used
			? variant ? 'retain-file-alias-proposed' : codeSet.has(original) ? 'retain-compatibility-file-proposed' : 'selected-original'
			: excludedUses.length ? 'omit-excluded-content-only-proposed' : 'omit-unreferenced-proposed';
		if (used && (variant || codeSet.has(original))) {
			addUrl(`${UPLOADS}${file}`, `${UPLOADS}${file}`, 'image-compatibility', disposition, 'pending');
		}
		return {
			path: file, original, variant, used, included: used, reason: disposition,
			excludedContentUses: excludedUses,
			approval: disposition === 'selected-original' ? 'not-required' : 'pending',
		};
	});
	for (const attachment of attachments) {
		attachment.included = usedOriginalSet.has(attachment.original);
		attachment.reason = attachment.included ? 'referenced-original' : 'unreferenced-attachment';
	}
	const actual = {
		posts: postCount,
		drafts: records.filter((entry) => entry.type === 'post' && entry.status === 'draft' && !entry.included).length,
		pages: records.filter((entry) => entry.type === 'page' && entry.included).length,
		placeholders: records.filter((entry) => entry.reason === 'placeholder-page').length,
		comments: comments.filter((entry) => entry.included).length,
		categories: taxonomies.filter((entry) => entry.taxonomy === 'category').length,
		tags: taxonomies.filter((entry) => entry.taxonomy === 'post_tag').length,
		originals: assets.length,
		images: assets.filter((entry) => entry.kind === 'image').length,
		downloads: assets.filter((entry) => entry.kind === 'download').length,
		codeImages: assets.filter((entry) => codeSet.has(entry.original)).length,
		optimizationCases: assets.filter((entry) => optimizationSet.has(entry.original)).length,
		usedVariants: uploadFiles.filter((entry) => entry.variant && entry.used).length,
		unusedOriginals: uploadFiles.filter((entry) => !entry.variant && !entry.used).length,
	};
	const reconciliation = Object.entries(EXPECTED).map(([metric, expected]) => ({
		metric, expected, actual: actual[metric],
		status: expected === actual[metric] ? 'matched' : 'owner-resolution-required',
	}));
	const baselineDifferences = {
		missingReportOriginals: baseline.originals.filter((file) => !usedOriginalSet.has(file)),
		additionalOriginals: usedOriginals.filter((file) => !baseline.originals.includes(file)),
		missingCodeImages: baseline.codeImages.filter((file) => !usedOriginalSet.has(file)),
		missingOptimizationCases: baseline.optimization.filter((file) => !usedOriginalSet.has(file)),
		reportUnusedButReferenced: baseline.unused.filter((file) => usedOriginalSet.has(file)),
		reportUnusedMissingFromDisk: baseline.unused.filter((file) => !fileSet.has(file)),
		unusedPhysicalOriginalsNotInReport: uploadFiles
			.filter((entry) => !entry.variant && !entry.used && !baseline.unused.includes(entry.path)).map((entry) => entry.path),
		reportUnusedClassifiedAsVariant: baseline.unused.filter((file) => (originalByFile.get(file) ?? file) !== file),
	};
	const counts = {
		items: tally(records), posts: tally(records.filter((entry) => entry.type === 'post')),
		pages: tally(records.filter((entry) => entry.type === 'page')),
		comments: tally(comments), attachments: tally(attachments), taxonomies: tally(taxonomies),
		uploadFiles: tally(uploadFiles),
	};
	const coverage = {
		selectedContentUrls: records.filter((entry) => entry.included).length,
		coveredContentUrls: records.filter((entry) => entry.included && manifest.has(entry.legacyUrl)).length,
		usedLocalReferences: uses.length,
		coveredLocalReferences: uses.filter((entry) => manifest.has(entry.source)).length,
		externalImageReferences: externalImages.length,
	};
	const inventory = {
		version: 1, sourceSha256: digest(xml), reportSha256: reportHash,
		readiness: 'blocked-pending-owner-review',
		counts, coverage, reconciliation, baselineDifferences,
		records: records.sort((a, b) => a.id - b.id),
		comments: comments.sort((a, b) => a.id - b.id),
		attachments: attachments.sort((a, b) => a.id - b.id),
		taxonomies: taxonomies.sort(sortBy('legacyUrl')),
		assets, imageReferences: uses.sort(sortBy('source')),
		externalImages: externalImages.sort(sortBy('url')),
		uploadFiles, privacyFindings: privacy, issues,
	};
	const outputManifest = {
		version: 1, sourceSha256: digest(xml),
		readiness: 'blocked-pending-owner-review',
		unknownAliases: { source: 'eps-301-redirects', status: 'owner-sanitized-export-required', verified: false },
		urls: [...manifest.values()].sort(sortBy('source')),
		assets, imageReferences: uses.sort(sortBy('source')),
		externalImages: externalImages.sort(sortBy('url')),
		uploadDispositions: uploadFiles,
	};
	// Never persist an email, even if one occurs outside the usual WordPress identity fields.
	const redact = (value) => JSON.parse(JSON.stringify(value).replace(EMAIL, '[redacted-email]'));
	return { inventory: redact(inventory), manifest: redact(outputManifest) };
}

export function acceptanceFailures({ inventory, manifest }) {
	return [
		...(inventory.coverage.selectedContentUrls !== inventory.coverage.coveredContentUrls
			|| inventory.coverage.usedLocalReferences !== inventory.coverage.coveredLocalReferences ? ['incomplete-manifest-coverage'] : []),
		...inventory.reconciliation.filter((entry) => entry.status !== 'matched').map((entry) => `baseline:${entry.metric}`),
		...Object.entries(inventory.baselineDifferences).filter(([, values]) => values.length).map(([key]) => `baseline:${key}`),
		...inventory.issues.map((entry) => entry.code),
		...(inventory.privacyFindings.length ? ['privacy-review-required'] : []),
		...(manifest.urls.some((entry) => entry.approval !== 'not-required') ? ['url-dispositions-awaiting-approval'] : []),
		'plugin-redirect-export-required',
		'owner-decisions-and-human-review-required',
	];
}

async function main() {
	const args = process.argv.slice(2);
	if (args.some((arg) => arg !== '--check')) fail('Usage: npm run migration:inventory -- [--check]');
	const root = process.cwd();
	const migrationRoot = path.join(root, '_migration');
	try {
		execFileSync('git', ['check-ignore', '--quiet', '_migration/'], { cwd: root, stdio: 'pipe' });
	} catch {
		fail('_migration/ must remain gitignored before inventory can run.');
	}
	if (execFileSync('git', ['ls-files', '--', '_migration'], { cwd: root, encoding: 'utf8' }).trim()) {
		fail('Tracked _migration inputs detected; remove them from the index before proceeding.');
	}
	if (await realpath(migrationRoot) !== migrationRoot) fail('_migration must be a local directory, not a symlink.');
	const exports = (await readdir(migrationRoot)).filter((file) => file.endsWith('.xml'));
	if (exports.length !== 1) fail('Expected exactly one WXR XML file directly under _migration/.');
	const xmlPath = path.join(migrationRoot, exports[0]);
	const uploadsRoot = path.join(migrationRoot, 'blog/wp-content/uploads');
	if (await realpath(xmlPath) !== xmlPath || await realpath(uploadsRoot) !== uploadsRoot) {
		fail('Migration inputs must not resolve through symlinks.');
	}
	const [xml, report] = await Promise.all([
		readFile(xmlPath, 'utf8'), readFile(path.join(root, 'MIGRATION-REPORT.md'), 'utf8'),
	]);
	const baseline = reportBaseline(report);
	for (const [key, count] of [['originals', 125], ['codeImages', 11], ['optimization', 20], ['unused', 74]]) {
		if (baseline[key].length !== count) fail(`Migration report ${key} baseline changed; review it explicitly.`);
	}
	const result = await createInventory({ xml, uploadsRoot, baseline, reportHash: digest(report) });
	const outputRoot = path.join(migrationRoot, 'inventory');
	await mkdir(outputRoot, { recursive: true });
	if (await realpath(outputRoot) !== outputRoot) fail('Inventory output must not be a symlink.');
	for (const [name, value] of Object.entries(result)) {
		const output = path.join(outputRoot, `${name === 'manifest' ? 'expected-output' : name}.json`);
		try {
			if (await realpath(output) !== output) fail('Inventory output files must not be symlinks.');
		} catch (error) {
			if (error.code !== 'ENOENT') throw error;
		}
		await writeFile(output, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
	}
	const failures = acceptanceFailures(result);
	console.log(`Inventory written locally: _migration/inventory/ (items=${result.inventory.counts.items.total}, selected posts=${result.inventory.counts.posts.included}, assets=${result.inventory.assets.length}).`);
	console.log(`Phase 1 acceptance blocked: ${unique(failures).length} check categories; review local manifests and the phase-one contract.`);
	if (args.includes('--check') && failures.length) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	main().catch((error) => {
		const detail = error instanceof InventoryError ? error.message
			: ['ENOENT', 'EACCES', 'EPERM'].includes(error.code) ? `Local input/output access failed (${error.code}); check the WXR, uploads, report, and output permissions.`
			: 'Unexpected parser or filesystem error; inspect the local inputs with the focused tests before retrying.';
		console.error(`Inventory failed: ${detail} No source values were logged.`);
		process.exitCode = 1;
	});
}
