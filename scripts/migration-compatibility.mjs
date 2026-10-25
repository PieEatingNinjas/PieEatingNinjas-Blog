import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { assertPrivateSafe, ImportError, transformImage } from './migration-import.mjs';
import { parseExport } from './migration-inventory.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const fail = (message) => { throw new ImportError(message); };
const array = (value) => value === undefined ? [] : Array.isArray(value) ? value : [value];

export function localPath(value) {
	assertPrivateSafe(value, 'compatibility path');
	if (typeof value !== 'string' || !/^\/(?!\/)[^?#\\\s]*$/.test(value)) fail('Expected a local compatibility path.');
	let decoded;
	try { decoded = decodeURIComponent(value); } catch { fail('Invalid compatibility path encoding.'); }
	if (/[?#\\\s\u0000-\u001f]/.test(decoded) || decoded.includes('//')
		|| decoded.split('/').some((part) => part === '.' || part === '..')
		|| new URL(value, 'https://blog.pieeatingninjas.be').pathname !== value) fail('Unsafe compatibility path.');
	return value;
}

export function compatibilityMap(inventory, expected, posts, pluginRedirects) {
	const postPaths = new Map(posts.posts.map((post) => [post.id, post.path]));
	const selected = inventory.records.filter((record) => record.included && ['post', 'page'].includes(record.type));
	for (const record of selected.filter((record) => record.type === 'post')) {
		if (postPaths.get(record.id) !== record.destination) fail('Inventory does not match the imported post map.');
	}
	if (postPaths.size !== selected.filter((record) => record.type === 'post').length) fail('Imported post count differs from the inventory.');
	const destinations = new Set(['/', ...selected.map((record) => localPath(record.destination))]);
	const taxonomies = inventory.taxonomies.map((term) => {
		if (!['category', 'post_tag'].includes(term.taxonomy)) fail('Unsupported taxonomy namespace.');
		const kind = term.taxonomy === 'category' ? 'category' : 'tag';
		const pathname = localPath(`/${kind}/${term.slug}/`);
		if (!term.slug || term.slug.includes('/') || !term.name) fail('Invalid taxonomy term.');
		destinations.add(pathname);
		return { kind, slug: term.slug, name: term.name };
	}).sort((a, b) => `${a.kind}/${a.slug}`.localeCompare(`${b.kind}/${b.slug}`, 'en'));
	if (new Set(taxonomies.map((term) => `${term.kind}/${term.slug}`)).size !== taxonomies.length) fail('Duplicate taxonomy.');
	const queryIds = { p: {}, page_id: {} };
	for (const record of selected) {
		if (!Number.isSafeInteger(record.id) || record.id <= 0) fail('Invalid query ID.');
		const key = record.type === 'post' ? 'p' : 'page_id';
		if (Object.hasOwn(queryIds.p, record.id) || Object.hasOwn(queryIds.page_id, record.id)) fail('Duplicate query ID.');
		queryIds[key][record.id] = localPath(record.destination);
	}
	const redirects = {};
	const add = (from, to) => {
		localPath(from);
		const destination = to.split('#')[0];
		localPath(destination);
		if (!destinations.has(destination)) fail('Alias destination is not a known content route.');
		if (from === destination || destinations.has(from)) fail('Alias collides with a content route.');
		if (redirects[from] && redirects[from] !== to) fail('Conflicting aliases.');
		redirects[from] = to;
	};
	for (const alias of expected.urls) {
		if (['old-slug', 'old-date', 'placeholder-page'].includes(alias.kind)
			|| alias.kind === 'page' && alias.source !== alias.destination) add(alias.source, alias.destination);
	}
	add('/page/1/', '/');
	for (const term of taxonomies) add(`/${term.kind}/${term.slug}/page/1/`, `/${term.kind}/${term.slug}/`);
	const imageAliases = [];
	for (const alias of posts.aliases) {
		if (alias.disposition === 'code') {
			if (alias.to.split('#').length !== 2 || !/^legacy-code-[a-z0-9-]+$/.test(alias.to.split('#')[1] ?? '')) fail('Invalid code replacement anchor.');
			add(alias.from, alias.to);
		} else if (['image', 'optimized-image'].includes(alias.disposition)) {
			for (const value of [alias.from, alias.to]) {
				localPath(value);
				if (!/^\/wp-content\/uploads\/\d{4}\/\d{2}\/[^/]+$/.test(value)) fail('Invalid image alias path.');
			}
			if (alias.from === alias.to) fail('Self-referencing image alias.');
			if (!/\.(?:gif|jpg|png)$/.test(alias.from)) fail('Unsupported image alias extension; add a static endpoint explicitly.');
			imageAliases.push({ from: alias.from, to: alias.to });
		} else fail('Unknown media alias disposition.');
	}
	const supplied = pluginRedirects !== undefined;
	const rules = supplied ? pluginRedirects : [];
	if (!Array.isArray(rules)) fail('Expected a sanitized plugin redirect array.');
	for (const alias of rules) {
		if (!alias || typeof alias !== 'object' || Array.isArray(alias)) fail('Expected plugin redirect objects.');
		if (Object.keys(alias).sort().join(',') !== 'from,to') fail('Plugin redirects must contain only from and to.');
		add(alias.from, localPath(alias.to));
	}
	const sources = imageAliases.map((alias) => alias.from);
	if (new Set(sources).size !== sources.length || sources.some((from) => Object.hasOwn(redirects, from))) {
		fail('Conflicting image aliases or HTML redirects.');
	}
	const result = {
		version: 1, pageSize: 10, taxonomies, queryIds,
		redirects: Object.fromEntries(Object.entries(redirects).sort(([a], [b]) => a.localeCompare(b, 'en'))),
		imageAliases: imageAliases.sort((a, b) => a.from.localeCompare(b.from, 'en')),
		pluginRedirects: { supplied, count: rules.length },
	};
	assertPrivateSafe(json(result), 'public compatibility map');
	return result;
}

async function safePath(root, relative) {
	const base = await realpath(root);
	const target = path.resolve(base, relative);
	if (!target.startsWith(`${base}${path.sep}`)) fail('Path escapes the migration root.');
	let current = base;
	for (const part of path.relative(base, target).split(path.sep)) {
		current = path.join(current, part);
		try { if ((await lstat(current)).isSymbolicLink()) fail('Symlinks are not supported in migration paths.'); }
		catch (error) { if (error.code !== 'ENOENT') throw error; }
	}
	return target;
}

async function optionalRead(file) {
	try { return await readFile(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function importCompatibility(root, sourceRoot) {
	const read = async (relative) => JSON.parse(await readFile(await safePath(root, relative), 'utf8'));
	const inventory = await read('_migration/inventory/inventory.json');
	const expected = await read('_migration/inventory/expected-output.json');
	const posts = await read('src/data/migration-posts.json');
	const exports = (await readdir(sourceRoot)).filter((name) => name.endsWith('.xml'));
	if (exports.length !== 1) fail('Expected one WXR export directly in the private source folder.');
	const xml = await readFile(await safePath(sourceRoot, exports[0]), 'utf8');
	if (hash(xml) !== inventory.sourceSha256 || hash(xml) !== expected.sourceSha256) fail('Inventory is stale; regenerate it for these private inputs.');
	const plugins = await optionalRead(await safePath(sourceRoot, 'eps-301-redirects.json'));
	const result = compatibilityMap(inventory, expected, posts, plugins ? JSON.parse(plugins) : undefined);
	const channel = parseExport(xml);
	const page = array(channel.item).find((item) => Number(item['wp:post_id']) === 1263);
	if (!page || page['wp:post_type'] !== 'page' || page['wp:status'] !== 'publish') fail('Selected legacy 404 page is missing.');
	const html = String(page['content:encoded']);
	assertPrivateSafe(html, 'legacy 404 body');
	const $ = load(html, {}, false);
	if ($('script, iframe, object, embed').length || $('img').length !== 1 || $('h2').length !== 2) fail('Legacy 404 markup changed; review the source.');
	const normalize = (value) => value.replace(/\s+/g, ' ').trim();
	if (normalize($.text()) !== normalize($('h2').toArray().map((element) => $(element).text()).join(' '))) {
		fail('Unexpected legacy 404 text outside the reviewed headings.');
	}
	const original = '2018/12/image.gif';
	if (new URL($('img').attr('src')).pathname !== `/wp-content/uploads/${original}`) fail('Unexpected legacy 404 image.');
	const image = await transformImage(await readFile(await safePath(sourceRoot, `blog/wp-content/uploads/${original}`)), original);
	result.notFound = {
		paragraphs: $('h2').toArray().map((element) => $(element).text().trim()),
		image: `/wp-content/uploads/${image.outputName}`,
		measurements: image.measurements,
	};
	assertPrivateSafe(json(result.notFound), 'legacy 404 content');
	if (result.notFound.image !== `/wp-content/uploads/${original}`) {
		result.imageAliases.push({ from: `/wp-content/uploads/${original}`, to: result.notFound.image });
	}
	const outputs = new Map([
		['src/data/migration-compatibility.json', Buffer.from(json(result))],
		[`public${result.notFound.image}`, image.output],
	]);
	const statePath = await safePath(root, '_migration/compatibility/state.json');
	const previous = await optionalRead(statePath);
	const state = previous ? JSON.parse(previous) : { files: {} };
	if (Object.keys(state.files).some((file) => !outputs.has(file))) fail('Compatibility output set changed; review removals explicitly.');
	for (const [relative, content] of outputs) {
		const existing = await optionalRead(await safePath(root, relative));
		if (existing && state.files[relative] !== hash(existing)) fail('Output collision or manually modified compatibility file; no outputs overwritten.');
		if (!content.length) fail('Empty compatibility output.');
	}
	for (const [relative, content] of outputs) {
		const target = await safePath(root, relative);
		await mkdir(path.dirname(target), { recursive: true });
		await writeFile(target, content);
	}
	await mkdir(path.dirname(statePath), { recursive: true });
	await writeFile(statePath, json({ version: 1, files: Object.fromEntries([...outputs].map(([name, content]) => [name, hash(content)])) }), { mode: 0o600 });
	return result;
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length && (args.length !== 2 || args[0] !== '--source')) fail('Usage: node scripts/migration-compatibility.mjs [--source /private/source]');
	const root = process.cwd();
	execFileSync('git', ['check-ignore', '--quiet', '_migration/'], { cwd: root, stdio: 'pipe' });
	if (execFileSync('git', ['ls-files', '--', '_migration'], { cwd: root, encoding: 'utf8' }).trim()) fail('Private migration data is tracked.');
	const result = await importCompatibility(root, args[1] ? path.resolve(args[1]) : path.join(root, '_migration'));
	console.log(`Compatibility map: ${result.taxonomies.length} terms, ${Object.values(result.queryIds).reduce((n, entries) => n + Object.keys(entries).length, 0)} query IDs, ${Object.keys(result.redirects).length} HTML redirects, ${result.imageAliases.length} image aliases.`);
	if (!result.pluginRedirects.supplied) console.log('UNRESOLVED: sanitized eps-301-redirects.json is absent; plugin alias acceptance remains blocked.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	main().catch((error) => {
		console.error(error instanceof ImportError ? `Compatibility import failed: ${error.message}`
			: 'Compatibility import failed: inspect local inputs and permissions; no private values logged.');
		process.exitCode = 1;
	});
}
