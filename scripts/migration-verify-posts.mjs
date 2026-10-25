import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import sharp from 'sharp';
import { PDFDocument, PDFName } from 'pdf-lib';
import { assertPrivateSafe, codeReplacements, importTaxonomy, sanitizePostBody } from './migration-import.mjs';
import { parseExport, reportBaseline, uploadPath } from './migration-inventory.mjs';
import { codeLanguageResolutions, codeRepositorySelections, documentLinks, externalScreenshot, externalScreenshotLocal } from './migration-resolutions.mjs';

const root = process.cwd();
const args = process.argv.slice(2);
assert.ok(!args.length || args.length === 2 && args[0] === '--source', 'Usage: npm run migration:verify-posts -- [--source /private/source]');
const sourceRoot = args[1] ? path.resolve(args[1]) : path.join(root, '_migration');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const manifest = JSON.parse(await read('src/data/migration-posts.json'));
const state = JSON.parse(await read('_migration/pilot/state.json'));
const exports = (await readdir(sourceRoot)).filter((file) => file.endsWith('.xml'));
assert.equal(exports.length, 1);
const channel = parseExport(await readFile(path.join(sourceRoot, exports[0]), 'utf8'));
const selected = channel.item.filter((item) => item['wp:post_type'] === 'post' && item['wp:status'] === 'publish' && !item['wp:post_password']);
assert.equal(selected.length, 62);
assert.equal(manifest.posts.length, 62);
assert.equal(new Set(manifest.posts.map((post) => post.id)).size, 62);
assert.equal(new Set(manifest.posts.map((post) => post.path)).size, 62);
const replacements = codeReplacements(await read('IMAGE-CODE-EXTRACTION-REPORT.md'));
const seenCodeImages = new Set();
const usedMedia = new Set();
let codeCount = 0;
let repositoryCount = 0;
let redactions = 0;
let emptyBlocks = 0;
const sourceMedia = new Set();
for (const post of manifest.posts) {
	const source = selected.find((item) => Number(item['wp:post_id']) === post.id);
	assert.ok(source, `Unexpected imported post ID ${post.id}`);
	assert.equal(new URL(source.link).pathname, post.path);
	const { html: sourceHtml, privacyRedactions } = sanitizePostBody(source['content:encoded'], post.id);
	redactions += privacyRedactions;
	const original = load(sourceHtml, {}, false);
	const markdown = await read(post.file);
	const field = (name) => {
		const line = markdown.split('\n').find((line) => line.startsWith(`${name}: `));
		return line ? JSON.parse(line.slice(name.length + 2)) : undefined;
	};
	const legacy = field('legacy');
	assert.equal(legacy.id, post.id);
	assert.equal(legacy.path, post.path);
	assert.equal(field('pubDate'), post.path.slice(1, 11).replaceAll('/', '-'));
	assert.deepEqual(field('categories'), importTaxonomy(source.category, 'category').values);
	assert.deepEqual(field('tags'), importTaxonomy(source.category, 'post_tag').values);
	assert.deepEqual(legacy.taxonomySlugs.categories, importTaxonomy(source.category, 'category').slugs);
	assert.deepEqual(legacy.taxonomySlugs.tags, importTaxonomy(source.category, 'post_tag').slugs);
	const repositories = codeRepositorySelections.get(post.id) ?? [];
	assert.deepEqual(field('codeRepositories') ?? [], repositories);
	repositoryCount += repositories.length;
	assertPrivateSafe(markdown, `post ${post.id} Markdown`);
	const html = await read(`dist${post.path}index.html`);
	const $ = load(html);
	assert.equal($('link[rel="canonical"]').attr('href'), `https://blog.pieeatingninjas.be${post.path}`);
	assert.equal($('article h1').first().text(), field('title'));
	const codes = $('article pre code').toArray().map((element) => $(element).text().replace(/\n+$/, ''));
	assert.equal(codes.length, post.sourceCode + post.imageCode);
	codeCount += codes.length;
	for (const [index, element] of original('pre').toArray().entries()) {
		if (codeLanguageResolutions.get(post.id)?.[index] === 'empty') {
			assert.equal(original(element).text().trim(), '');
			emptyBlocks++;
		} else assert.ok(codes.includes(original(element).text().replace(/\n+$/, '')), `Code text mismatch in post ${post.id}, block ${index}`);
	}
	for (const [file, replacement] of replacements) {
		if (codes.includes(replacement.code)) seenCodeImages.add(file);
	}
	assert.equal($('article script, article iframe, article ins').length, 0);
	for (const element of $('article img, article video').toArray()) {
		const src = $(element).attr('src');
		assert.ok(src?.startsWith('/wp-content/uploads/'), `Nonlocal media in post ${post.id}`);
		usedMedia.add(src);
		await readFile(path.join(root, 'dist', src));
	}
	for (const element of $('article a[href]').toArray()) {
		const href = $(element).attr('href');
		assert.ok(!href.startsWith('http://blog.pieeatingninjas.be/') && !href.startsWith('https://blog.pieeatingninjas.be/'));
		if (href.startsWith('/wp-content/uploads/')) {
			usedMedia.add(href);
			await readFile(path.join(root, 'dist', href));
		}
	}
	for (const element of original('a[href], img[src]').toArray()) {
		const value = original(element).attr('href') ?? original(element).attr('src');
		const relative = uploadPath(value);
		if (relative) sourceMedia.add(relative.replace(/-\d+x\d+(?=\.[^.]+$)/, ''));
	}
	assert.doesNotMatch(markdown, /i\d\.wp\.com|wp-block|<!--\s*wp:|\[\/?caption\b|adsbygoogle|MIGRATIONBLOCK\d+PLACEHOLDER/);
}
assert.equal(seenCodeImages.size, 7);
assert.equal(redactions, 2);
assert.equal(emptyBlocks, 1);
assert.equal(manifest.posts.reduce((sum, post) => sum + post.videos, 0), 2);
assert.equal(manifest.posts.reduce((sum, post) => sum + post.externalImagesLocalized, 0), 1);
assert.equal(manifest.assets.filter((asset) => asset.kind === 'video').length, 2);
assert.equal(manifest.assets.filter((asset) => asset.kind === 'document').length, 2);
assert.deepEqual([...usedMedia].sort(), manifest.assets.map((asset) => asset.path).sort());
for (const asset of manifest.assets) {
	const bytes = await readFile(path.join(root, 'dist', asset.path));
	assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
	assert.equal(bytes.length, asset.outputBytes);
	if (asset.kind === 'document') {
		assert.ok(documentLinks.has(asset.original));
		const document = await PDFDocument.load(bytes, { updateMetadata: false });
		assert.equal(document.getPageCount(), asset.pages);
		assert.equal(document.context.trailerInfo.Info, undefined);
		assert.equal(document.catalog.has(PDFName.of('Metadata')), false);
		assert.ok(!/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(bytes.toString('latin1')), 'Privacy finding in PDF bytes; no private value logged');
	}
	if (asset.kind === 'image') {
		const metadata = await sharp(bytes).metadata();
		assert.ok(bytes.length <= 500_000 && metadata.width <= 1600);
		assert.equal(metadata.exif, undefined);
		assert.equal(metadata.iptc, undefined);
		assert.equal(metadata.xmp, undefined);
		assert.equal(metadata.pages ?? 1, asset.frames);
		assert.equal(metadata.delay?.reduce((sum, delay) => sum + delay, 0) ?? 0, asset.durationMs);
	}
}
const expectedSourceMedia = new Set([...manifest.assets.map((asset) => asset.original), ...replacements.keys(), ...documentLinks.keys()]);
assert.deepEqual([...sourceMedia].filter((file) => !expectedSourceMedia.has(file)), []);
for (const alias of manifest.aliases) {
	if (alias.disposition === 'code') {
		const [destination, fragment] = alias.to.split('#');
		const $ = load(await read(`dist${destination}index.html`));
		assert.equal($(`[id="${fragment}"]`).length, 1);
	} else if (alias.disposition === 'official-document') assert.equal(alias.to, documentLinks.get(alias.from.replace('/wp-content/uploads/', '')));
	else await readFile(path.join(root, 'dist', alias.to));
}
const baseline = reportBaseline(await read('MIGRATION-REPORT.md'));
const optimized = baseline.optimization.filter((file) => file !== '2018/12/image.gif');
assert.equal(optimized.length, 19);
for (const file of optimized) assert.ok(manifest.assets.some((asset) => asset.original === file), 'Missing post optimization case');
for (const [file, expected] of Object.entries(state.files)) {
	const bytes = await readFile(path.join(root, file));
	assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, 'Owned import output was modified');
}
async function walk(directory, files = []) {
	for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
		const relative = `${directory}/${entry.name}`;
		assert.notEqual(entry.name, '_migration');
		if (entry.isDirectory()) await walk(relative, files);
		else {
			files.push(relative);
			if (/\.(?:mdx?|astro|[cm]?js|ts|json|html|xml|css|txt|svg)$/i.test(entry.name)) {
				assertPrivateSafe(await read(relative), 'source/public/build privacy scan');
				assert.ok(!/WordPress\.2026|<wp:wxr_version|<wp:comment_author_email/.test(await read(relative)));
			}
		}
	}
	return files;
}
for (const directory of ['src', 'public', 'dist']) await walk(directory);
const copied = await walk('public/wp-content/uploads');
const compatibility = JSON.parse(await read('src/data/migration-compatibility.json'));
assert.deepEqual(copied.sort(), [...manifest.assets.map((asset) => `public${asset.path}`), `public${compatibility.notFound.image}`].sort());
const externalPost = manifest.posts.find((post) => post.id === 1986);
assert.ok(!(await read(externalPost.file)).includes(externalScreenshot));
const screenshot = manifest.assets.find((asset) => asset.original === externalScreenshotLocal);
assert.ok(screenshot, 'Approved external screenshot must be copied locally');
const screenshotHtml = load(await read(`dist${externalPost.path}index.html`));
assert.equal(screenshotHtml(`article img[src="${screenshot.path}"]`).length, 1);
const eid = load(await read('dist/2020/02/15/reading-belgian-eid-in-uwp-using-smartcardreader/index.html'));
assert.equal(eid('article a[href="https://github.com/Fedict/eid-mw"]').text(), 'official Belgian eID middleware repository');
assert.equal(eid('article a').filter((_, element) => eid(element).text() === 'Belgian eID content document').attr('href'),
	'/wp-content/uploads/2020/02/belgian_electronic_identity_card_content_v2.8.a.pdf');
for (const file of documentLinks.keys()) {
	assert.ok(eid(`article a[href="/wp-content/uploads/${file}"]`).length > 0, 'Missing local PDF link');
	assert.ok(!eid('article a').toArray().some((element) => eid(element).attr('href') === documentLinks.get(file)), 'Remote PDF link remains');
}
assert.equal(eid('article img[alt="Address file structure"]').attr('src'), '/wp-content/uploads/2020/02/Addressfile-contents.jpg');
const linkify = load(await read('dist/2018/12/07/using-android-linkify-to-add-inline-links-to-a-xamarin-forms-label/index.html'));
const linkifyImage = linkify('article img[alt="HyperlinkLabel"]');
assert.equal(linkifyImage.length, 1);
assert.equal(linkifyImage.closest('p').text().trim(), '', 'Linkify screenshot must not merge into the introduction');
assert.ok(linkify('article p code').toArray().some((element) => linkify(element).text() === 'TextView'));
console.log(`Verified ${manifest.posts.length} posts, ${codeCount} exact code blocks, ${seenCodeImages.size} code-image replacements, ${manifest.assets.length} local media, ${repositoryCount} reviewed repository references, ${optimized.length} post optimization cases, ${redactions} privacy redactions and zero privacy/output failures. Pages, comments and legacy alias serving remain outside this post-import scope.`);
