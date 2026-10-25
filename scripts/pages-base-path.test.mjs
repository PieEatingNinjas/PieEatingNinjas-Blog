import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applyBasePath, findUnprefixed, normalizeBasePath, rewriteCss, rewriteHtml } from './pages-base-path.mjs';

const base = '/example-repo';

test('normalizes and validates the base path', () => {
	assert.equal(normalizeBasePath('/example-repo/'), base);
	assert.equal(normalizeBasePath(base), base);
	for (const bad of ['', '/', 'example-repo', '//evil.example', '/a/../b', '/a b', 'https://x.example/a']) {
		assert.throws(() => normalizeBasePath(bad), /PAGES_BASE_PATH/, bad);
	}
});

test('prefixes root-relative attributes but leaves other URLs alone', () => {
	const html = '<a href="/">Home</a><a href="/2015/11/07/post/#c-1">Post</a><img src="/wp-content/uploads/2015/11/a.png">'
		+ '<a href="https://example.com/x">x</a><a href="//cdn.example/y">y</a><a href="#top">t</a><a data-href="/keep">k</a>'
		+ '<code>href=&quot;/escaped&quot;</code>';
	assert.equal(rewriteHtml(html, base),
		'<a href="/example-repo/">Home</a><a href="/example-repo/2015/11/07/post/#c-1">Post</a><img src="/example-repo/wp-content/uploads/2015/11/a.png">'
		+ '<a href="https://example.com/x">x</a><a href="//cdn.example/y">y</a><a href="#top">t</a><a data-href="/keep">k</a>'
		+ '<code>href=&quot;/escaped&quot;</code>');
});

test('prefixes srcset candidates, refresh redirects and CSS urls', () => {
	assert.equal(rewriteHtml('<img srcset="/a.png 1x, https://x.example/b.png 2x, /c.png 3x">', base),
		'<img srcset="/example-repo/a.png 1x, https://x.example/b.png 2x, /example-repo/c.png 3x">');
	assert.equal(rewriteHtml('<meta http-equiv="refresh" content="0;url=/new/"><a href="/new/">go</a>', base),
		'<meta http-equiv="refresh" content="0;url=/example-repo/new/"><a href="/example-repo/new/">go</a>');
	assert.equal(rewriteCss('a{src:url("/_astro/f.woff")} b{background:url(/i.png)} c{background:url(//x/y)}', base),
		'a{src:url("/example-repo/_astro/f.woff")} b{background:url(/example-repo/i.png)} c{background:url(//x/y)}');
});

test('prefixes the local Giscus theme without changing built-in or external themes', () => {
	const html = '<script data-theme="/giscus-theme.css"></script><script data-theme="light"></script>'
		+ '<script data-theme="https://example.com/theme.css"></script>';
	assert.equal(rewriteHtml(html, base),
		'<script data-theme="/example-repo/giscus-theme.css"></script><script data-theme="light"></script>'
		+ '<script data-theme="https://example.com/theme.css"></script>');
	assert.deepEqual(findUnprefixed(html, base), ['/giscus-theme.css']);
	assert.deepEqual(findUnprefixed(rewriteHtml(html, base), base), []);
});

test('prefixes legacy query-ID destinations', () => {
	const html = '<script id="legacy-query-ids" type="application/json">{"p":{"7":"/2015/11/05/a/"},"page_id":{"5":"/about/"}}</script>';
	assert.equal(rewriteHtml(html, base),
		'<script id="legacy-query-ids" type="application/json">{"p":{"7":"/example-repo/2015/11/05/a/"},"page_id":{"5":"/example-repo/about/"}}</script>');
	assert.throws(() => rewriteHtml(html.replace('/about/', 'https://evil.example/'), base), /query ID 5/);
});

test('reports unprefixed root-relative URLs', () => {
	assert.deepEqual(findUnprefixed('<a href="/x/">x</a><a href="/example-repo/">ok</a><img srcset="/y.png 2x">', base), ['/x/', '/y.png']);
});

test('rewrites a synthetic dist directory and keeps the feeds byte-identical', async () => {
	const dist = await mkdtemp(path.join(os.tmpdir(), 'pages-base-'));
	try {
		const feed = '<?xml version="1.0"?><rss><channel><link>https://site.example/</link></channel></rss>';
		await mkdir(path.join(dist, 'feed'));
		await mkdir(path.join(dist, '_astro'));
		await writeFile(path.join(dist, 'index.html'), '<a href="/about/">About</a>');
		await writeFile(path.join(dist, '_astro', 'a.css'), 'x{src:url(/_astro/f.woff)}');
		await writeFile(path.join(dist, 'rss.xml'), feed);
		await writeFile(path.join(dist, 'feed', 'index.html'), feed);
		assert.deepEqual(await applyBasePath(dist, '/example-repo/'), { base, changed: 2 });
		assert.equal(await readFile(path.join(dist, 'index.html'), 'utf8'), '<a href="/example-repo/about/">About</a>');
		assert.equal(await readFile(path.join(dist, '_astro', 'a.css'), 'utf8'), 'x{src:url(/example-repo/_astro/f.woff)}');
		assert.equal(await readFile(path.join(dist, 'feed', 'index.html'), 'utf8'), feed);
	} finally {
		await rm(dist, { recursive: true, force: true });
	}
});
