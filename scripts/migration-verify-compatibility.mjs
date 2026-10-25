import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import { XMLValidator } from 'fast-xml-parser';
import sharp from 'sharp';
import { assertPrivateSafe } from './migration-import.mjs';

const args = process.argv.slice(2);
assert.ok(!args.length || args.length === 1 && args[0] === '--check', 'Usage: npm run migration:verify-compatibility -- [--check]');
const root = process.cwd();
const origin = 'https://blog.pieeatingninjas.be';
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const map = JSON.parse(await read('src/data/migration-compatibility.json'));
const inventory = JSON.parse(await read('_migration/inventory/inventory.json'));
const expected = JSON.parse(await read('_migration/inventory/expected-output.json'));
const posts = inventory.records.filter((record) => record.included && record.type === 'post')
	.sort((a, b) => b.permalinkDate.localeCompare(a.permalinkDate) || b.id - a.id);
assert.equal(posts.length, 62);
assert.equal(map.taxonomies.filter((term) => term.kind === 'category').length, 44);
assert.equal(map.taxonomies.filter((term) => term.kind === 'tag').length, 7);
assert.equal(map.pageSize, 10);

const outputFile = (url) => {
	const pathname = decodeURIComponent(url.split('#')[0]);
	assert.ok(pathname.startsWith('/') && !pathname.startsWith('//') && !pathname.includes('..'));
	return `dist${pathname}${pathname.endsWith('/') ? 'index.html' : ''}`;
};
const html = async (url) => load(await read(outputFile(url)));
const exists = async (url) => {
	assert.ok((await stat(path.join(root, outputFile(url)))).isFile(), 'Expected a generated destination.');
};
const archiveGroups = [{ base: '/', records: posts }, ...inventory.taxonomies.map((term) => ({
	base: `/${term.taxonomy === 'category' ? 'category' : 'tag'}/${term.slug}/`,
	records: posts.filter((post) => post.terms.some((entry) => entry.taxonomy === term.taxonomy && entry.slug === term.slug)),
}))];
let archiveCount = 0;
const expectedArchiveFiles = [];
const archiveUrls = [];
for (const group of archiveGroups) {
	const pages = Math.max(1, Math.ceil(group.records.length / map.pageSize));
	const ids = [];
	for (let page = 1; page <= pages; page++) {
		const url = page === 1 ? group.base : `${group.base}page/${page}/`;
		expectedArchiveFiles.push(outputFile(url));
		archiveUrls.push(url);
		const $ = await html(url);
		assert.equal($('link[rel="canonical"]').attr('href'), `${origin}${url}`);
		const actual = $('.post-list > li').toArray().map((element) => Number($(element).attr('data-post-id')));
		assert.deepEqual(actual, group.records.slice((page - 1) * map.pageSize, page * map.pageSize).map((post) => post.id));
		ids.push(...actual);
		const nav = $('nav[aria-label="Archive pagination"]');
		assert.equal(nav.find('a[rel="prev"]').length, page > 1 ? 1 : 0);
		assert.equal(nav.find('a[rel="next"]').length, page < pages ? 1 : 0);
		for (const element of nav.find('a[href]').toArray()) await exists($(element).attr('href'));
		for (const element of $('.post-list a[href]').toArray()) await exists($(element).attr('href'));
		for (const element of $('.post-list img').toArray()) await exists($(element).attr('src'));
		archiveCount++;
	}
	assert.equal(new Set(ids).size, ids.length);
	assert.deepEqual(ids, group.records.map((post) => post.id));
}
assert.equal(archiveGroups[0].records.length, 62);
const rss = await readFile(path.join(root, 'dist/rss.xml'));
assert.ok(rss.equals(await readFile(path.join(root, 'dist/feed/index.html'))), 'Feed files differ.');
assert.equal(XMLValidator.validate(rss.toString()), true);
const feed = load(rss.toString(), { xml: true });
assert.deepEqual(feed('item > link').toArray().map((element) => feed(element).text()), posts.map((post) => `${origin}${post.destination}`));
const queryEntries = expected.urls.filter((entry) => entry.kind === 'query-id');
assert.equal(queryEntries.length, 66);
assert.equal(Object.values(map.queryIds).reduce((count, ids) => count + Object.keys(ids).length, 0), 66);
for (const entry of queryEntries) {
	const [key, id] = new URL(entry.source, origin).searchParams.entries().next().value;
	assert.equal(map.queryIds[key][id], entry.destination);
	await exists(entry.destination);
}
const home = await html('/');
assert.deepEqual(JSON.parse(home('#legacy-query-ids').text()), map.queryIds);
for (const [from, to] of Object.entries(map.redirects)) {
	const $ = await html(from.endsWith('/') ? from : `${from}/`);
	assert.equal($('meta[http-equiv="refresh"]').attr('content'), `0;url=${to}`);
	assert.equal($('link[rel="canonical"]').attr('href'), `${origin}${to}`);
	await exists(to);
	assert.ok(!Object.hasOwn(map.redirects, to.split('#')[0]), 'Alias chain or loop.');
	if (to.includes('#')) {
		const target = await html(to);
		assert.equal(target(`[id="${to.split('#')[1]}"]`).length, 1);
	}
}
for (const alias of map.imageAliases) {
	const bytes = await readFile(path.join(root, outputFile(alias.from)));
	assert.ok(bytes.equals(await readFile(path.join(root, `public${alias.to}`))), 'Image alias bytes differ.');
	const image = await sharp(bytes, { animated: true }).metadata();
	assert.ok(image.width <= 1600 && bytes.length <= 500000);
}
const notFound = await html('/404.html');
assert.ok(notFound('a[href="/"]').length > 0);
assert.equal(notFound('article img').attr('src'), map.notFound.image);
const animation = await sharp(path.join(root, 'dist', map.notFound.image), { animated: true }).metadata();
const originalAnimation = await sharp(path.join(root, '_migration/blog/wp-content/uploads/2018/12/image.gif'), { animated: true }).metadata();
assert.equal(animation.pages, map.notFound.measurements.frames);
assert.equal(animation.pages, originalAnimation.pages);
assert.equal(animation.loop, originalAnimation.loop);
assert.equal(animation.delay.reduce((sum, delay) => sum + delay, 0), map.notFound.measurements.durationMs);
assert.ok(map.notFound.measurements.outputBytes <= 500000);
const sitemap = load(await read('dist/sitemap-0.xml'), { xml: true });
const urls = new Set(sitemap('loc').toArray().map((element) => decodeURI(sitemap(element).text())));
for (const url of archiveUrls) assert.ok(urls.has(decodeURI(`${origin}${url}`)));
for (const from of Object.keys(map.redirects)) assert.ok(!urls.has(decodeURI(`${origin}${from}`)));
assert.ok(!urls.has(`${origin}/feed/index.html`));
const actualArchiveFiles = [];
async function scan(directory) {
	for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
		assert.ok(!['_migration', '_migrations'].includes(entry.name), 'Private migration directory leaked.');
		const relative = `${directory}/${entry.name}`;
		if (entry.isDirectory()) await scan(relative);
		else if (/\.(?:mdx?|astro|[cm]?js|ts|json|html|xml|css|txt|svg)$/i.test(entry.name)) {
			const content = await read(relative);
			if (relative.startsWith('dist/') && relative.endsWith('.html') && load(content)('ul.post-list').length) {
				actualArchiveFiles.push(relative);
			}
			assertPrivateSafe(content, 'compatibility privacy scan');
			assert.ok(!/WordPress\.2026|<wp:wxr_version|<wp:comment_author_email/.test(content), 'Raw migration source leaked.');
		}
	}
}
for (const directory of ['src', 'public', 'dist']) await scan(directory);
assert.deepEqual(actualArchiveFiles.sort(), expectedArchiveFiles.sort(), 'Unexpected or missing archive pages.');
console.log(`Verified: ${posts.length}/62 posts, 7 home pages, 44/44 categories, 7/7 tags, ${archiveCount} archive pages, 66/66 query IDs, ${Object.keys(map.redirects).length} HTML aliases, ${map.imageAliases.length} byte-identical image aliases, both XML feeds and zero privacy findings.`);
const unresolvedAttachments = expected.urls.filter((entry) => entry.kind.startsWith('attachment-') && !entry.destination).length;
const pendingImages = expected.urls.filter((entry) => ['image-compatibility', 'referenced-image-alias'].includes(entry.kind)
	&& !map.imageAliases.some((alias) => alias.from === entry.source)
	&& !Object.hasOwn(map.redirects, entry.source));
const unresolved = [
	...(!map.pluginRedirects.supplied ? ['Missing sanitized eps-301-redirects list.'] : []),
	...(unresolvedAttachments ? [`${unresolvedAttachments} attachment URL/query dispositions require owner decisions.`] : []),
	...(pendingImages.length ? [`${pendingImages.length} inventoried image-variant dispositions remain unapproved/unserved.`] : []),
	'Pagination proposal, historical alias dates and browser appearance require owner acceptance.',
	'About, Book and Privacy Policy still contain phase-two placeholder content; query destinations exist but their content remains outside this phase.',
];
for (const issue of unresolved) console.log(`UNRESOLVED: ${issue}`);
if (args.includes('--check') && unresolved.length) process.exitCode = 1;
