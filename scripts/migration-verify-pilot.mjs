import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import { assertPrivateSafe, codeReplacements } from './migration-import.mjs';

const root = process.cwd();
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const manifest = JSON.parse(await read('src/data/migration-pilot.json'));
const replacements = codeReplacements(await read('IMAGE-CODE-EXTRACTION-REPORT.md'));
assert.equal(manifest.posts.length, 5);
assert.equal(manifest.assets.length, 9);
assert.equal(manifest.posts.reduce((sum, post) => sum + post.sourceCode, 0), 10);
assert.equal(manifest.posts.reduce((sum, post) => sum + post.imageCode, 0), 7);
const usedImages = new Set();
const seenCode = new Set();
const expectedRepositories = new Map([
	[132, ['https://github.com/PieEatingNinjas/TestRxUniversal']],
	[275, ['https://github.com/PieEatingNinjas/PivotWithoutSwipe']],
]);
for (const post of manifest.posts) {
	const html = await read(`dist${post.path}index.html`);
	const $ = load(html);
	assert.equal($('link[rel="canonical"]').attr('href'), `https://blog.pieeatingninjas.be${post.path}`);
	const codes = $('article pre code').toArray().map((element) => $(element).text().replace(/\n$/, ''));
	assert.equal(codes.length, post.sourceCode + post.imageCode);
	for (const [file, replacement] of replacements) {
		if (codes.includes(replacement.code)) seenCode.add(file);
	}
	assert.equal($('article script, article iframe, article ins').length, 0);
	for (const element of $('article img').toArray()) {
		const src = $(element).attr('src');
		assert.ok(src.startsWith('/wp-content/uploads/'));
		usedImages.add(src);
		await readFile(path.join(root, 'dist', src));
	}
	const markdown = await read(post.file);
	const field = (name) => JSON.parse(markdown.split('\n').find((line) => line.startsWith(`${name}: `)).slice(name.length + 2));
	const legacy = field('legacy');
	for (const namespace of ['categories', 'tags']) {
		const values = field(namespace);
		assert.deepEqual(legacy.taxonomySlugs[namespace], values.map((value) => value === 'C#' ? 'c' : value).sort());
		assert.ok(!values.includes('c'), 'C# must not be exposed as the c slug.');
	}
	assert.equal(field('categories').includes('C#'), [132, 275].includes(post.id));
	assert.equal(field('tags').includes('C#'), [16, 132].includes(post.id));
	const repositoryLine = markdown.split('\n').find((line) => line.startsWith('codeRepositories: '));
	const repositories = repositoryLine ? JSON.parse(repositoryLine.slice('codeRepositories: '.length)) : [];
	assert.deepEqual(repositories, expectedRepositories.get(post.id) ?? []);
	for (const repository of repositories) assert.ok($('article a[href]').toArray().some((element) => $(element).attr('href') === repository));
	assert.doesNotMatch(markdown, /i0\.wp\.com|wp-block|<!--\s*wp:|\[\/?caption\b|adsbygoogle/);
	assertPrivateSafe(markdown, 'pilot source');
}
assert.equal(seenCode.size, 7);
assert.deepEqual([...usedImages].sort(), manifest.assets.map((asset) => asset.path).sort());
for (const asset of manifest.assets) {
	const bytes = await readFile(path.join(root, 'dist', asset.path));
	assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
	assert.equal(bytes.length, asset.outputBytes);
	assert.ok(bytes.length <= 500_000 && asset.width <= 1600);
}
for (const alias of manifest.aliases) {
	if (alias.disposition === 'code') {
		const [destination, fragment] = alias.to.split('#');
		const $ = load(await read(`dist${destination}index.html`));
		assert.equal($(`[id="${fragment}"]`).length, 1);
	} else await readFile(path.join(root, 'dist', alias.to));
}
async function scan(directory) {
	for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
		const relative = `${directory}/${entry.name}`;
		assert.notEqual(entry.name, '_migration');
		assert.ok(!/\.xml$/i.test(entry.name) || directory === 'dist' && /^(?:rss|sitemap.*)\.xml$/.test(entry.name));
		if (entry.isDirectory()) await scan(relative);
		else if (/\.(?:mdx?|astro|[cm]?js|ts|json|html|xml|css|txt|svg)$/i.test(entry.name)) {
			assertPrivateSafe(await read(relative), 'source/public/build privacy scan');
		}
	}
}
for (const directory of ['src', 'public', 'dist']) await scan(directory);
console.log('Pilot verified: 5 exact routes/canonicals, 17 tagged code blocks (7 image replacements), 9 referenced images, valid mapped destinations, image budgets and zero privacy/artifact findings. Legacy alias serving remains phase-4 work.');
