// Temporary preview support: GitHub Pages without a custom domain serves the
// site under /<repository>/ instead of the domain root. The site itself is built
// for the root of https://blog.pieeatingninjas.be, so this post-build step
// prefixes root-relative URLs in dist/ when PAGES_BASE_PATH is set. Without
// PAGES_BASE_PATH it does nothing. Remove it once the custom domain is mapped
// (see README "GitHub Pages deployment").
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export class BasePathError extends Error {}

const fail = (message) => { throw new BasePathError(message); };
const LOCAL = /^\/(?!\/)/;
const ATTRIBUTE = /(\s(?:href|src|poster|action|data-theme))="(\/(?!\/)[^"]*)"/g;
const SRCSET = /(\ssrcset)="([^"]*)"/g;
const REFRESH = /(<meta http-equiv="refresh" content="\d+;\s*url=)(\/(?!\/)[^"]*)"/g;
const CSS_URL = /url\((["']?)(\/(?!\/))/g;
const QUERY_MAP = /(<script id="legacy-query-ids" type="application\/json">)([^<]*)(<\/script>)/g;

export function normalizeBasePath(value) {
	if (typeof value !== 'string' || !/^\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*\/?$/.test(value)
		|| value.split('/').some((part) => part === '.' || part === '..')) {
		fail('PAGES_BASE_PATH must look like "/repository-name" (letters, digits, ".", "_" or "-").');
	}
	return value.replace(/\/$/, '');
}

const prefix = (value, base) => `${base}${value}`;

export function rewriteCss(text, base) {
	return text.replace(CSS_URL, (_, quote, slash) => `url(${quote}${base}${slash}`);
}

export function rewriteHtml(text, base) {
	return rewriteCss(text, base)
		.replace(ATTRIBUTE, (_, name, value) => `${name}="${prefix(value, base)}"`)
		.replace(SRCSET, (_, name, value) => `${name}="${value.split(',').map((candidate) => {
			const trimmed = candidate.trim();
			return `${candidate.slice(0, candidate.indexOf(trimmed))}${LOCAL.test(trimmed) ? prefix(trimmed, base) : trimmed}`;
		}).join(',')}"`)
		.replace(REFRESH, (_, start, value) => `${start}${prefix(value, base)}"`)
		.replace(QUERY_MAP, (_, open, body, close) => {
			let ids;
			try { ids = JSON.parse(body); } catch { fail('Legacy query-ID map is not valid JSON.'); }
			for (const map of Object.values(ids)) {
				for (const [id, destination] of Object.entries(map)) {
					if (typeof destination !== 'string' || !LOCAL.test(destination)) fail(`Legacy query ID ${id} has no local destination.`);
					map[id] = prefix(destination, base);
				}
			}
			return `${open}${JSON.stringify(ids).replaceAll('<', '\\u003c')}${close}`;
		});
}

/** Returns descriptions of root-relative URLs that were not prefixed. */
export function findUnprefixed(text, base) {
	const outside = (value) => LOCAL.test(value) && value !== base && !value.startsWith(`${base}/`);
	const findings = [];
	for (const [, , value] of text.matchAll(ATTRIBUTE)) if (outside(value)) findings.push(value);
	for (const [, , value] of text.matchAll(REFRESH)) if (outside(value)) findings.push(value);
	for (const match of text.matchAll(/url\((["']?)(\/(?!\/)[^"')]*)/g)) if (outside(match[2])) findings.push(match[2]);
	for (const [, , value] of text.matchAll(SRCSET)) {
		for (const candidate of value.split(',')) {
			const url = candidate.trim().split(/\s+/)[0];
			if (outside(url)) findings.push(url);
		}
	}
	return findings;
}

async function files(directory) {
	const result = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const full = path.join(directory, entry.name);
		if (entry.isDirectory()) result.push(...await files(full));
		else if (entry.isFile()) result.push(full);
	}
	return result;
}

export async function applyBasePath(dist, rawBase) {
	const base = normalizeBasePath(rawBase);
	const feed = path.join(dist, 'feed', 'index.html');
	const all = await files(dist);
	let changed = 0;
	const problems = [];
	for (const file of all) {
		const relative = path.relative(dist, file);
		const isHtml = file.endsWith('.html') && file !== feed;
		const isCss = file.endsWith('.css');
		if (!isHtml && !isCss) continue;
		const original = await readFile(file, 'utf8');
		const rewritten = isHtml ? rewriteHtml(original, base) : rewriteCss(original, base);
		for (const value of findUnprefixed(rewritten, base)) problems.push(`${relative}: ${value}`);
		if (rewritten !== original) {
			await writeFile(file, rewritten);
			changed += 1;
		}
	}
	if (problems.length) fail(`Root-relative URLs left without ${base}:\n${problems.slice(0, 20).join('\n')}`);
	const rss = path.join(dist, 'rss.xml');
	if (all.includes(rss) && all.includes(feed)
		&& !(await readFile(rss)).equals(await readFile(feed))) fail('feed/index.html no longer matches rss.xml.');
	return { base, changed };
}

async function main() {
	const raw = process.env.PAGES_BASE_PATH;
	if (!raw) {
		console.log('PAGES_BASE_PATH is not set; dist/ is left unchanged for root deployment.');
		return;
	}
	const dist = path.resolve(process.argv[2] ?? 'dist');
	const { base, changed } = await applyBasePath(dist, raw);
	console.log(`Prefixed root-relative URLs with ${base} in ${changed} file(s).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	main().catch((error) => {
		console.error(error instanceof BasePathError ? `Base path rewrite failed: ${error.message}` : error);
		process.exitCode = 1;
	});
}
