import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { z } from 'astro/zod';
import { load } from 'cheerio';
import { assertUniqueRoutes, canonicalUrl, parsePostPath, postUrl } from '../src/lib/urls.ts';
import { legacyPageSchema, matchesLegacyDate, postFields } from '../src/lib/content-schema.ts';
import { legacyPages } from '../src/lib/legacy-pages.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const schema = z.object(postFields).refine(matchesLegacyDate);
const data = {
	title: 'Synthetic route test', description: 'Synthetic content, not a migrated article.',
	pubDate: '2020-02-29', categories: ['shared'], tags: ['shared'],
	legacy: { id: 900001, path: '/2020/02/29/leap-day/' },
};

test('legacy dates use permalink calendar parts and reject invalid dates and missing trailing slashes', () => {
	assert.deepEqual(parsePostPath('/2020/02/29/leap-day/'), {
		year: '2020', month: '02', day: '29', slug: 'leap-day', date: '2020-02-29',
	});
	for (const value of ['/2021/02/29/invalid/', '/2020/13/01/invalid/', '/2020/01/00/invalid/',
		'/2020/01/01/post', '/2020/1/1/post/', '//2020/01/01/post/']) {
		assert.throws(() => parsePostPath(value));
	}
});

test('encoded legacy slugs remain exact and unsafe or malformed segments are rejected', () => {
	for (const slug of ['don%e2%80%99t-change', 'caf%C3%A9', 'plain-slug', "don't-change"]) {
		const url = `/2020/01/01/${slug}/`;
		assert.equal(postUrl({ id: 'not-used-for-routing', data: { legacy: { id: 1, path: url } } }), url);
		assert.equal(parsePostPath(url).slug, slug);
	}
	for (const slug of ['bad%ZZ', 'bad%2Fpath', 'bad%5Cpath', 'bad%3Fquery', 'bad%23fragment', '.', '..', 'two words']) {
		assert.throws(() => parsePostPath(`/2020/01/01/${slug}/`));
	}
	assert.equal(postUrl({ id: 'starter', data: {} }), '/blog/starter/');
	assert.equal(canonicalUrl('/2020/01/01/caf%C3%A9/'), 'https://blog.pieeatingninjas.be/2020/01/01/caf%C3%A9/');
	assert.throws(() => canonicalUrl('//external.invalid/'));
});

test('date validation and display day are timezone-independent', () => {
	for (const timeZone of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
		const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
			import { z } from 'astro/zod';
			import { postFields, matchesLegacyDate } from './src/lib/content-schema.ts';
			const entry = z.object(postFields).refine(matchesLegacyDate).parse(${JSON.stringify(data)});
			console.log(entry.pubDate.toLocaleDateString('en-us', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' }));
		`], { cwd: root, encoding: 'utf8', env: { ...process.env, TZ: timeZone } });
		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.stdout.trim(), 'Feb 29, 2020');
	}
	assert.equal(schema.safeParse({ ...data, pubDate: '2020-03-01' }).success, false);
});

test('legacy IDs and paths cannot collide across posts and selected pages', () => {
	assert.throws(() => assertUniqueRoutes([{ path: '/about/', legacyId: 5 }, { path: '/other/', legacyId: 5 }]), /ID/);
	assert.throws(() => assertUniqueRoutes([{ path: '/same/' }, { path: '/same/' }]), /path/);
	assert.throws(() => assertUniqueRoutes([{ path: '/caf%C3%A9/' }, { path: '/caf%c3%a9/' }]), /path/);
	assert.throws(() => assertUniqueRoutes([{ path: '/one/', legacyId: 0 }]), /positive/);
	assertUniqueRoutes([{ path: '/one/', legacyId: 1 }, { path: '/two/', legacyId: 2 }]);
});

test('schemas keep categories/tags separate and only permit the four selected page roles', () => {
	const entry = schema.parse(data);
	assert.deepEqual(entry.categories, ['shared']);
	assert.deepEqual(entry.tags, ['shared']);
	assert.equal(entry.legacy.id, 900001);
	const withTaxonomy = schema.parse({ ...data, categories: ['C#'], tags: ['C#'],
		legacy: { ...data.legacy, taxonomySlugs: { categories: ['c'], tags: ['c'] } } });
	assert.deepEqual(withTaxonomy.categories, ['C#']);
	assert.deepEqual(withTaxonomy.tags, ['C#']);
	assert.deepEqual(withTaxonomy.legacy.taxonomySlugs, { categories: ['c'], tags: ['c'] });
	assert.equal(schema.safeParse({ ...data, legacy: { ...data.legacy, id: -1 } }).success, false);
	assert.equal(schema.safeParse({ ...data, legacy: { ...data.legacy, path: '/2021/02/29/no/' } }).success, false);
	assert.deepEqual(Object.values(legacyPages).map((page) => page.path).sort(),
		['/404.html', '/about/', '/book/', '/privacy-policy/']);
	for (const role of ['home', 'blog', 'draft']) {
		assert.equal(legacyPageSchema.safeParse({ ...legacyPages.about, role }).success, false);
	}
	assert.equal(legacyPageSchema.safeParse({ ...legacyPages.about, path: '/wrong/' }).success, false);
	assert.equal(legacyPageSchema.safeParse({ ...legacyPages.about, status: 'draft' }).success, false);
});

test('optional code repositories support multiple canonical GitHub URLs and reject unsafe or ambiguous values', () => {
	assert.deepEqual(schema.parse(data).codeRepositories, []);
	const codeRepositories = ['https://github.com/example/sample', 'https://github.com/example/second-sample'];
	assert.deepEqual(schema.parse({ ...data, codeRepositories }).codeRepositories, codeRepositories);
	for (const url of ['http://github.com/example/sample', 'https://github.com/example',
		'https://github.com/example/sample/tree/main', 'https://github.com/example/sample?token=secret',
		'https://github.com/example/sample#readme', 'https://github.com/example/sample/',
		'https://github.com.evil.invalid/example/sample', 'javascript:alert(1)', 'https://github.com/example/..']) {
		assert.equal(schema.safeParse({ ...data, codeRepositories: [url] }).success, false);
	}
	assert.equal(schema.safeParse({ ...data, codeRepositories: [codeRepositories[0], codeRepositories[0].toUpperCase()] }).success, false);
	assert.equal(schema.safeParse({ ...data, codeRepositories: [codeRepositories[0], codeRepositories[0]] }).success, false);
});

test('static build emits dated fixture pages, canonicals, archive/feed links and genuine 404 output', async (t) => {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'astro-routing-test-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	await Promise.all([
		cp(path.join(root, 'src'), path.join(directory, 'src'), { recursive: true }),
		cp(path.join(root, 'public'), path.join(directory, 'public'), { recursive: true }),
		cp(path.join(root, 'astro.config.mjs'), path.join(directory, 'astro.config.mjs')),
		cp(path.join(root, 'tsconfig.json'), path.join(directory, 'tsconfig.json')),
		cp(path.join(root, 'package.json'), path.join(directory, 'package.json')),
		symlink(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'dir'),
	]);
	const configFile = path.join(directory, 'astro.config.mjs');
	await writeFile(configFile, (await readFile(configFile, 'utf8')).replace('defineConfig({', "defineConfig({\n\tcacheDir: './.astro-cache/',"));
	const compatibilityFile = path.join(directory, 'src/data/legacy-site.json');
	const compatibility = JSON.parse(await readFile(compatibilityFile, 'utf8'));
	compatibility.taxonomies.push({ kind: 'category', slug: 'shared', name: 'Synthetic category' },
		{ kind: 'tag', slug: 'shared', name: 'Synthetic tag' });
	await writeFile(compatibilityFile, JSON.stringify(compatibility));
	const fixtures = [
		{ ...data },
		{ ...data, pubDate: '2023-12-31', legacy: { id: 900002, path: '/2023/12/31/caf%c3%a9/' } },
		{ ...data, pubDate: '2024-01-01', legacy: { id: 900003, path: '/2024/01/01/don%e2%80%99t-change/' } },
	];
	for (const [index, entry] of fixtures.entries()) {
		await writeFile(path.join(directory, 'src/content/blog', `synthetic-${index}.md`),
			`---\n${JSON.stringify(entry, null, 2)}\n---\nSynthetic route fixture.\n`);
	}
	await writeFile(path.join(directory, 'src/content/blog', 'synthetic-nonlegacy.md'),
		`---\n${JSON.stringify({ title: 'Synthetic nonlegacy post', description: 'Fallback route fixture.', pubDate: '2020-01-01' })}\n---\nSynthetic fallback fixture.\n`);
	const result = spawnSync(process.execPath, [path.join(root, 'node_modules/astro/bin/astro.mjs'), 'build'], {
		cwd: directory, encoding: 'utf8', timeout: 120000,
		env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', TZ: 'America/Los_Angeles' },
	});
	assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
	const output = path.join(directory, 'dist');
	for (const entry of fixtures) {
		const pathname = entry.legacy.path;
		const html = await readFile(path.join(output, decodeURIComponent(pathname).slice(1), 'index.html'), 'utf8');
		const $ = load(html);
		assert.equal($('link[rel="canonical"]').attr('href'), canonicalUrl(pathname));
		assert.equal($('meta[property="og:url"]').attr('content'), canonicalUrl(pathname));
		assert.equal($('time').first().text().trim(), new Date(entry.pubDate).toLocaleDateString('en-us', {
			timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric',
		}));
	}
	for (const page of Object.values(legacyPages)) {
		const file = page.path === '/404.html' ? '404.html' : `${page.path.slice(1)}index.html`;
		const $ = load(await readFile(path.join(output, file), 'utf8'));
		assert.equal($('link[rel="canonical"]').attr('href'), canonicalUrl(page.path));
		if (page.role === 'book') {
			assert.equal($('meta[http-equiv="refresh"]').length, 0);
			assert.match($('h2').text(), /The MVVM Pattern in \.NET MAUI/);
		}
	}
	const listings = [];
	for (let page = 1; ; page++) {
		const html = await readFile(path.join(output, page === 1 ? 'index.html' : `page/${page}/index.html`), 'utf8');
		const $ = load(html);
		listings.push($);
		if (!$('nav[aria-label="Archive pagination"] a[rel="next"]').length) break;
	}
	const listing = listings[0];
	assert.equal(listing('link[rel="canonical"]').attr('href'), canonicalUrl('/'));
	assert.ok(!listing.text().includes('Hello, Astronaut!'));
	assert.deepEqual(listing('header .internal-links a').toArray().map((element) => listing(element).text().trim()), ['Blog', 'About', 'Book']);
	const blogRedirect = load(await readFile(path.join(output, 'blog/index.html'), 'utf8'));
	assert.match(blogRedirect('meta[http-equiv="refresh"]').attr('content'), /url=\/$/);
	assert.equal(blogRedirect('link[rel="canonical"]').attr('href'), canonicalUrl('/'));
	for (const entry of fixtures) {
		assert.ok(listings.some(($) => $('a').toArray().some((element) => $(element).attr('href') === entry.legacy.path)));
	}
	const feed = await readFile(path.join(output, 'rss.xml'), 'utf8');
	for (const entry of fixtures) assert.ok(feed.includes(canonicalUrl(entry.legacy.path)));
	const old404 = await readFile(path.join(output, '404-error-content-does-not-exist-anymore/index.html'), 'utf8');
	assert.ok(old404.includes('/404.html'));
	assert.ok((await readFile(path.join(output, 'blog/synthetic-nonlegacy/index.html'), 'utf8')).includes('Synthetic nonlegacy post'));
	const sitemap = await readFile(path.join(output, 'sitemap-0.xml'), 'utf8');
	assert.ok(!sitemap.includes('example.com'));
	const sitemapUrls = load(sitemap, { xml: true })('loc').toArray().map((element) => decodeURI(element.children[0].data));
	for (const entry of fixtures) {
		assert.ok(sitemapUrls.includes(decodeURI(canonicalUrl(entry.legacy.path))), `Missing sitemap URL: ${entry.legacy.path}`);
	}
	await writeFile(path.join(directory, 'src/content/blog', 'collision.md'),
		`---\n${JSON.stringify({ ...data, legacy: { id: legacyPages.about.legacyId, path: '/2020/02/29/collision/' } })}\n---\nSynthetic collision.\n`);
	const collision = spawnSync(process.execPath, [path.join(root, 'node_modules/astro/bin/astro.mjs'), 'build'], {
		cwd: directory, encoding: 'utf8', timeout: 120000,
		env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
	});
	assert.notEqual(collision.status, 0);
	assert.match(`${collision.stdout}\n${collision.stderr}`, /Duplicate WordPress ID/);
});
