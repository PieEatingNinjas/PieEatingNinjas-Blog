import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { load } from 'cheerio';
import sharp from 'sharp';
import { compatibilityMap, importCompatibility, localPath } from './migration-compatibility.mjs';
import { archivePages, sortedPosts } from '../src/lib/archives.ts';
import { resolveLegacyQuery } from '../src/lib/legacy-query.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const makePost = (id, date = '2020-01-01', categories = ['c'], tags = []) => ({
	id: `synthetic-${id}`,
	data: {
		title: `Synthetic ${id}`, description: 'Synthetic non-personal fixture.',
		pubDate: new Date(date), categories: categories.map((value) => value === 'c' ? 'C#' : value),
		tags: tags.map((value) => value === 'c' ? 'C#' : value), codeRepositories: [],
		legacy: { id, path: `/${date.replaceAll('-', '/')}/synthetic-${id}/`, taxonomySlugs: { categories, tags } },
	},
});

test('pagination is deterministic, preserves sets and keeps category/tag namespaces separate', () => {
	const posts = Array.from({ length: 23 }, (_, i) => makePost(i + 1, '2020-01-01', ['c'], i < 2 ? ['c'] : []));
	const pages = archivePages(posts, 10);
	const home = pages.filter((page) => page.base === '/');
	assert.equal(home.length, 3);
	assert.deepEqual(home.map((page) => page.posts.length), [10, 10, 3]);
	assert.deepEqual(home.map((page) => page.path), ['/', '/page/2/', '/page/3/']);
	assert.equal(home[0].previous, undefined);
	assert.equal(home[2].next, undefined);
	assert.equal(new Set(home.flatMap((page) => page.posts.map((post) => post.id))).size, 23);
	assert.deepEqual(sortedPosts(posts).map((post) => post.data.legacy.id), Array.from({ length: 23 }, (_, i) => 23 - i));
	assert.equal(pages.filter((page) => page.base === '/category/c/').length, 3);
	assert.equal(pages.find((page) => page.path === '/tag/c/').posts.length, 2);
	assert.equal(pages.find((page) => page.path === '/category/c/').title, 'Category: C#');
	const empty = pages.find((page) => page.base === '/category/ai/');
	assert.deepEqual(empty.posts, []);
	assert.equal(empty.total, 1);
	assert.throws(() => archivePages(posts, 0), /positive integer/);
	assert.throws(() => archivePages([makePost(1, '2020-01-01', ['not-reviewed'])]), /reviewed taxonomy/);
});

test('query redirects use exact known IDs, reject malformed/ambiguous input and preserve fragments', () => {
	const ids = { p: { 42: '/2020/01/01/synthetic/' }, page_id: { 5: '/about/' } };
	assert.equal(resolveLegacyQuery('?p=42', '#comment-12', ids), '/2020/01/01/synthetic/#comment-12');
	assert.equal(resolveLegacyQuery('?page_id=5', '', ids), '/about/');
	assert.equal(resolveLegacyQuery('?p=42&tracking=none', '', ids), '/2020/01/01/synthetic/');
	for (const search of ['?p=0', '?p=99', '?p=-1', '?p=042', '?p=42.0', '?p=42&p=42',
		'?p=42&page_id=5', '?p=9007199254740992', '?p=//external.invalid', '?p=__proto__',
		'?p=%3Cscript%3E', '?attachment_id=42', '?page_id=42']) {
		assert.equal(resolveLegacyQuery(search, '', ids), undefined);
	}
	for (const destination of ['//external.invalid/', 'https://external.invalid/', '/\\external.invalid/', '/a/../b/']) {
		assert.equal(resolveLegacyQuery('?p=42', '', { ...ids, p: { 42: destination } }), undefined);
	}
});

test('compatibility maps reject off-site paths, collisions, stale post selections and unsafe plugin input', () => {
	const inventory = {
		records: [{ id: 42, included: true, type: 'post', destination: '/2020/01/01/synthetic/' }],
		taxonomies: [{ taxonomy: 'category', slug: 'c', name: 'C#' }, { taxonomy: 'post_tag', slug: 'c', name: 'C#' }],
	};
	const expected = { urls: [{ kind: 'old-slug', source: '/2020/01/01/old/', destination: '/2020/01/01/synthetic/' }] };
	const posts = { posts: [{ id: 42, path: '/2020/01/01/synthetic/' }], aliases: [] };
	const result = compatibilityMap(inventory, expected, posts);
	assert.equal(result.redirects['/page/1/'], '/');
	assert.equal(result.redirects['/category/c/page/1/'], '/category/c/');
	assert.equal(result.queryIds.p[42], '/2020/01/01/synthetic/');
	assert.equal(result.taxonomies.length, 2);
	assert.equal(result.pluginRedirects.supplied, false);
	assert.equal(compatibilityMap(inventory, expected, posts, []).pluginRedirects.supplied, true);
	assert.equal(compatibilityMap(inventory, expected, posts, [{ from: '/plugin/', to: '/' }]).redirects['/plugin/'], '/');
	for (const value of ['//external.invalid/', '/a/../b/', '/%2e%2e/secret/', '/a?b=c', '/bad\\path/', '/bad%ZZ/']) {
		assert.throws(() => localPath(value));
	}
	assert.throws(() => compatibilityMap(inventory, expected, { ...posts, posts: [] }), /match/);
	assert.throws(() => compatibilityMap(inventory, expected, posts, [{ from: '/old/', to: 'https://external.invalid/' }]));
	assert.throws(() => compatibilityMap(inventory, expected, posts, [{ from: '/old/', to: '/missing/' }]), /known content/);
	assert.throws(() => compatibilityMap(inventory, expected, posts, [{ from: '/old/', to: '/', author: 'unwanted' }]), /only from and to/);
	assert.throws(() => compatibilityMap(inventory, expected, posts, [{ from: '/', to: '/2020/01/01/synthetic/' }]), /collides/);
});

test('compatibility import is deterministic, preserves manual changes and rejects stale inventories and symlinks', async (t) => {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'compatibility-import-test-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	const source = path.join(directory, '_migration');
	for (const folder of ['_migration/inventory', '_migration/blog/wp-content/uploads/2018/12', 'src/data']) {
		await mkdir(path.join(directory, folder), { recursive: true });
	}
	const xml = `<rss><channel><wp:wxr_version>1.2</wp:wxr_version><item><wp:post_id>1263</wp:post_id><wp:post_type>page</wp:post_type><wp:status>publish</wp:status><content:encoded><![CDATA[<div><h2>Synthetic missing page <img src="https://blog.pieeatingninjas.be/wp-content/uploads/2018/12/image.gif" /></h2><h2>Try the archive.</h2></div>]]></content:encoded></item></channel></rss>`;
	const sourceSha256 = createHash('sha256').update(xml).digest('hex');
	const inventory = { sourceSha256, records: [
		{ id: 42, included: true, type: 'post', destination: '/2020/01/01/synthetic/' },
		{ id: 1263, included: true, type: 'page', destination: '/404.html' },
	], taxonomies: [] };
	await writeFile(path.join(source, 'synthetic.xml'), xml);
	await writeFile(path.join(source, 'inventory/inventory.json'), JSON.stringify(inventory));
	await writeFile(path.join(source, 'inventory/expected-output.json'), JSON.stringify({ sourceSha256, urls: [] }));
	await writeFile(path.join(directory, 'src/data/migration-posts.json'), JSON.stringify({
		posts: [{ id: 42, path: '/2020/01/01/synthetic/' }], aliases: [],
	}));
	const raw = Buffer.concat([Buffer.alloc(4 * 4 * 3, 30), Buffer.alloc(4 * 4 * 3, 220)]);
	await writeFile(path.join(source, 'blog/wp-content/uploads/2018/12/image.gif'),
		await sharp(raw, { raw: { width: 4, height: 8, channels: 3, pageHeight: 4 } }).gif({ loop: 0, delay: [100, 200] }).toBuffer());
	const first = await importCompatibility(directory, source);
	const mapFile = path.join(directory, 'src/data/migration-compatibility.json');
	const stateFile = path.join(source, 'compatibility/state.json');
	const bytes = await readFile(mapFile);
	const state = await readFile(stateFile);
	assert.deepEqual(await importCompatibility(directory, source), first);
	assert.ok(bytes.equals(await readFile(mapFile)));
	assert.ok(state.equals(await readFile(stateFile)));
	await writeFile(mapFile, `${bytes}\n`);
	await assert.rejects(importCompatibility(directory, source), /manually modified/);
	await writeFile(mapFile, bytes);
	await writeFile(path.join(source, 'inventory/inventory.json'), JSON.stringify({ ...inventory, sourceSha256: 'stale' }));
	await assert.rejects(importCompatibility(directory, source), /stale/);
	await writeFile(path.join(source, 'inventory/inventory.json'), JSON.stringify(inventory));
	await rm(path.join(directory, 'src/data/migration-compatibility.json'));
	await symlink(path.join(directory, 'src/data/migration-posts.json'), mapFile);
	await assert.rejects(importCompatibility(directory, source), /Symlinks/);
});

test('built synthetic pagination, empty states, taxonomies and both XML feeds agree', async (t) => {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'astro-compatibility-test-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	await Promise.all([
		cp(path.join(root, 'src'), path.join(directory, 'src'), { recursive: true }),
		cp(path.join(root, 'public'), path.join(directory, 'public'), { recursive: true }),
		...['astro.config.mjs', 'tsconfig.json', 'package.json'].map((file) => cp(path.join(root, file), path.join(directory, file))),
		symlink(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'dir'),
	]);
	const configFile = path.join(directory, 'astro.config.mjs');
	await writeFile(configFile, (await readFile(configFile, 'utf8')).replace('defineConfig({', "defineConfig({\n\tcacheDir: './.astro-cache/',"));
	await rm(path.join(directory, 'src/content/blog'), { recursive: true });
	await mkdir(path.join(directory, 'src/content/blog'), { recursive: true });
	const fixtures = Array.from({ length: 23 }, (_, i) => makePost(900100 + i, '2020-01-01', ['c'], i < 2 ? ['c'] : []));
	for (const post of fixtures) {
		await writeFile(path.join(directory, `src/content/blog/${post.id}.md`), `---\n${JSON.stringify(post.data)}\n---\nSynthetic content.\n`);
	}
	const result = spawnSync(process.execPath, [path.join(root, 'node_modules/astro/bin/astro.mjs'), 'build'], {
		cwd: directory, encoding: 'utf8', timeout: 120000, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
	});
	assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
	for (const base of ['/', '/category/c/']) {
		const ids = [];
		for (let page = 1; page <= 3; page++) {
			const pathname = page === 1 ? base : `${base}page/${page}/`;
			const $ = load(await readFile(path.join(directory, `dist${pathname}index.html`), 'utf8'));
			ids.push(...$('.post-list > li').toArray().map((element) => Number($(element).attr('data-post-id'))));
			assert.equal($('link[rel="canonical"]').attr('href'), `https://blog.pieeatingninjas.be${pathname}`);
			assert.equal($('nav[aria-label="Archive pagination"] a[rel="prev"]').length, page > 1 ? 1 : 0);
			assert.equal($('nav[aria-label="Archive pagination"] a[rel="next"]').length, page < 3 ? 1 : 0);
		}
		assert.deepEqual(ids, fixtures.map((post) => post.data.legacy.id).reverse());
	}
	const empty = load(await readFile(path.join(directory, 'dist/category/ai/index.html'), 'utf8'));
	assert.equal(empty('.post-list > li').length, 0);
	assert.match(empty('main').text(), /No posts/);
	assert.equal(empty('nav[aria-label="Archive pagination"] a').length, 0);
	const tag = load(await readFile(path.join(directory, 'dist/tag/c/index.html'), 'utf8'));
	assert.equal(tag('.post-list > li').length, 2);
	assert.equal(tag('h1').text(), 'Tag: C#');
	const rss = await readFile(path.join(directory, 'dist/rss.xml'));
	assert.ok(rss.equals(await readFile(path.join(directory, 'dist/feed/index.html'))));
	const feed = load(rss.toString(), { xml: true });
	assert.equal(feed('item').length, 23);
	assert.deepEqual(feed('item > link').toArray().map((element) => feed(element).text()),
		[...fixtures].reverse().map((post) => `https://blog.pieeatingninjas.be${post.data.legacy.path}`));
});
