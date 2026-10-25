import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { PDFDocument, PDFName, PDFRef } from 'pdf-lib';
import sharp from 'sharp';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { parseExport, uploadPath } from './migration-inventory.mjs';
import { isCodeRepositoryUrl, parsePostPath } from '../src/lib/urls.ts';
import { codeLanguageResolutions, codeRepositorySelections, documentLinks, externalScreenshot, externalScreenshotLocal, preferredWidths } from './migration-resolutions.mjs';

const ORIGIN = 'https://blog.pieeatingninjas.be';
const PREFIX = '/wp-content/uploads/';
const EMAIL = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PILOT_PATHS = [
	'/2015/11/05/starting-a-blog-since-2011/',
	'/2015/11/07/deferred-loading-mind-the-visual-state-manager/',
	'/2015/11/14/using-rx-in-a-uwp-project-with-mvvm/',
	'/2015/11/15/xbind-and-inheritance/',
	'/2015/12/30/disable-gestures-on-pivot-control/',
];
const PILOT_CODE_REPOSITORIES = new Map([
	['/2015/11/14/using-rx-in-a-uwp-project-with-mvvm/', ['https://github.com/PieEatingNinjas/TestRxUniversal']],
	['/2015/12/30/disable-gestures-on-pivot-control/', ['https://github.com/PieEatingNinjas/PivotWithoutSwipe']],
]);
const array = (value) => value === undefined ? [] : Array.isArray(value) ? value : [value];
const hash = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const text = (value) => String(value?.['#text'] ?? value ?? '');
const fail = (message) => { throw new ImportError(message); };
export class ImportError extends Error {}

export function assertPrivateSafe(value, label) {
	let decoded = String(value);
	for (let pass = 0; pass < 3; pass++) {
		if (EMAIL.test(decoded)) fail(`Privacy finding in ${label}; no private value logged.`);
		const $ = load(decoded, {}, false);
		decoded = [$.text(), ...$('*').toArray().flatMap((element) => Object.values(element.attribs))].join('\n');
		try {
			decoded = decoded.replace(/(?:%[a-f0-9]{2})+/gi, (part) => decodeURIComponent(part));
		} catch { fail(`Invalid encoding in ${label}.`); }
	}
	if (EMAIL.test(decoded)) fail(`Privacy finding in ${label}; no private value logged.`);
}

export function safeLink(value) {
	assertPrivateSafe(value, 'URL');
	let url;
	try { url = new URL(value, ORIGIN); } catch { fail('Malformed URL.'); }
	const publicOneDriveShare = url.origin === 'https://onedrive.live.com' && url.pathname === '/redir'
		&& /^[A-F0-9]+!\d+$/.test(url.searchParams.get('resid') ?? '')
		&& /^![A-Za-z0-9_-]+$/.test(url.searchParams.get('authkey') ?? '')
		&& [...url.searchParams.keys()].every((key) => ['resid', 'authkey', 'ithint'].includes(key));
	if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password
		|| [...url.searchParams.keys()].some((key) => /email|token|secret|password|auth|key/i.test(key) && !(publicOneDriveShare && key === 'authkey'))) {
		fail('Unsafe URL; review locally.');
	}
	return url.hostname === new URL(ORIGIN).hostname ? `${url.pathname}${url.search}${url.hash}` : url.href;
}

export function reviewedCodeRepositories(html, repositories) {
	const $ = load(html, {}, false);
	const links = new Set($('a[href]').toArray().map((element) => {
		const href = $(element).attr('href');
		const match = /^https:\/\/github\.com\/([^/]+\/[^/?#]+)(?:\/(?:tree|blob|wiki)(?:\/[^?#]*)?)?\/?$/.exec(href);
		return match ? `https://github.com/${match[1].replace(/\/$/, '')}` : href;
	}));
	const seen = new Set();
	for (const repository of repositories) {
		if (!isCodeRepositoryUrl(repository) || safeLink(repository) !== repository) fail('Invalid reviewed code repository URL.');
		const key = repository.toLowerCase();
		if (seen.has(key)) fail('Duplicate reviewed code repository.');
		if (!links.has(repository)) fail('Reviewed code repository link is missing from the source post.');
		seen.add(key);
	}
	return [...repositories];
}

export function importTaxonomy(terms, domain) {
	const selected = array(terms).filter((term) => term['@_domain'] === domain);
	const slugs = selected.map((term) => text(term['@_nicename']));
	if (slugs.some((slug) => !slug)) fail('Missing legacy taxonomy slug.');
	const values = selected.map((term) => text(term).trim() === 'C#' ? 'C#' : text(term['@_nicename']));
	return {
		values: [...new Set(values)].sort(),
		slugs: [...new Set(slugs)].sort(),
	};
}

export function codeReplacements(report) {
	const replacements = new Map();
	for (const match of report.matchAll(/### `(\d{4}\/\d{2}\/[^`]+)`\s+Post:[^\n]+\s+```(\w+)\n([\s\S]*?)\n```/g)) {
		if (replacements.has(match[1])) fail('Duplicate code-image transcription.');
		replacements.set(match[1], { language: match[2], code: match[3] });
	}
	if (replacements.size !== 7) fail('Expected exactly seven reviewed code-image transcriptions.');
	return replacements;
}

export function fence(code, language) {
	const languages = {
		'c#': 'csharp', cs: 'csharp', csharp: 'csharp', xaml: 'xml', xml: 'xml', xhtml: 'xml',
		powershell: 'powershell', ps: 'powershell', yaml: 'yaml', yml: 'yaml',
		shell: 'bash', sh: 'bash', bash: 'bash', applescript: 'applescript', vb: 'vb', vbnet: 'vb',
		javascript: 'javascript', js: 'javascript', python: 'python', json: 'json', text: 'text',
	};
	const tag = languages[language?.toLowerCase()];
	if (!tag) fail('Unknown code language; add an explicitly reviewed language mapping.');
	const delimiter = '`'.repeat(Math.max(3, ...[...code.matchAll(/`+/g)].map((match) => match[0].length + 1)));
	return `\n\n${delimiter}${tag}\n${code.replace(/\n$/, '')}\n${delimiter}\n\n`;
}

function preserveParagraphs($) {
	const block = new Set(['div', 'p', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
		'pre', 'ul', 'ol', 'table', 'blockquote', 'hr']);
	let result = '';
	let paragraph = '';
	const flush = () => {
		if (paragraph.trim()) result += `<p>${paragraph}</p>`;
		paragraph = '';
	};
	for (const node of $.root().contents().toArray()) {
		const standaloneImage = node.tagName === 'img'
			|| node.tagName === 'a' && $(node).children().length === 1
				&& $(node).children().first().is('img') && !$(node).text().trim();
		if (standaloneImage) {
			flush();
			result += `<p>${$.html(node)}</p>`;
		} else if (block.has(node.tagName)) {
			flush();
			result += $.html(node);
		} else {
			const parts = $.html(node).split(/\n[ \t]*\n/);
			for (const [index, part] of parts.entries()) {
				if (index) flush();
				paragraph += part;
			}
		}
	}
	flush();
	return result;
}

export async function convertMarkup(html, { image, replacements = new Map(), postPath, styledSnippet = false,
	languageResolutions = {}, allowPostMedia = false }) {
	assertPrivateSafe(html, 'post body');
	if (/MIGRATIONBLOCK\d+PLACEHOLDER/.test(html)) fail('Reserved conversion marker in source.');
	const blocks = [];
	const keep = (markdown) => {
		const token = `MIGRATIONBLOCK${blocks.length}PLACEHOLDER`;
		blocks.push(markdown);
		return `<div>${token}</div>`;
	};
	const metrics = { sourceCode: 0, imageCode: 0, captions: 0, removedAds: 0, emptyCode: 0, videos: 0, externalImagesLocalized: 0 };
	if (styledSnippet) {
		let count = 0;
		html = html.replace(/<p style="margin-bottom:0;">[\s\S]*?<\/p>\s*}\s*(?=\n\nMind you)/, (snippet) => {
			count++;
			const $ = load(snippet, {}, false);
			const lines = $('p').toArray().map((element) => {
				const indent = Number($(element).attr('style')?.match(/padding-left:(\d+)px/)?.[1] ?? 0) / 30;
				return `${'    '.repeat(indent)}${$(element).text().replace(/\u00a0/g, ' ').replace(/\n$/, '')}`;
			});
			metrics.sourceCode++;
			return keep(fence(`${lines.join('\n')}\n}`, 'csharp'));
		});
		if (count !== 1) fail('Reviewed styled C# snippet changed in post 16; inspect locally.');
	}
	html = html.replace(/<!--[\s\S]*?-->/g, '');
	html = html.replace(/\[caption\b[^\]]*\]([\s\S]*?)\[\/caption\]/g, (_, content) => {
		metrics.captions++;
		return `<figure>${content}</figure>`;
	});
	if (allowPostMedia) {
		const videos = [...html.matchAll(/\[video\b([^\]]*)\]\s*\[\/video\]/g)];
		for (const match of videos) {
			const attributes = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((value) => [value[1], value[2]]));
			if (Object.keys(attributes).some((key) => !['mp4', 'width', 'height'].includes(key)) || !attributes.mp4) {
				fail('Unsupported video shortcode attributes.');
			}
			const media = await image(attributes.mp4);
			if (!media.url.endsWith('.mp4')) fail('Video shortcode must reference reviewed MP4 media.');
			metrics.videos++;
			html = html.replace(match[0], keep(`<video controls preload="metadata" src="${media.url}"><a href="${media.url}">Download video</a></video>`));
		}
	}
	const $ = load(html, {}, false);
	for (const element of $('script, ins').toArray()) {
		const node = $(element);
		const knownAd = element.tagName === 'ins' ? node.hasClass('adsbygoogle')
			: /^(?:https?:)?\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js$/.test(node.attr('src') ?? '')
				|| /^\s*\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\);\s*$/.test(node.text());
		if (!knownAd) fail('Unsupported executable markup; review locally.');
		node.remove();
		metrics.removedAds++;
	}
	for (const element of $('*').toArray()) {
		if (Object.keys(element.attribs).some((key) => /^on/i.test(key))) fail('Event handler in imported markup.');
	}
	if ($('iframe, object, embed, style, form, input, video, audio, source, svg').length) {
		fail('Unsupported embedded content; pilot does not silently drop it.');
	}
	for (const element of $('span.crayon-inline, code[data-enlighter-language]').toArray()) {
		if ($(element).parents('pre').length) continue;
		$(element).replaceWith($('<code>').text($(element).text()));
	}
	for (const [index, element] of $('pre').toArray().entries()) {
		const node = $(element);
		const language = languageResolutions[index] ?? `${node.attr('class') ?? ''} ${node.find('code').attr('class') ?? ''}`
			.match(/(?:lang:|language-|lang-)([\w#+-]+)/)?.[1]
			?? node.attr('data-enlighter-language');
		if (language === 'empty') {
			if (node.text().trim()) fail('Reviewed empty code block is no longer empty.');
			node.remove();
			metrics.emptyCode++;
			continue;
		}
		metrics.sourceCode++;
		const title = node.attr('title');
		const caption = title ? new TurndownService().escape(title)
			.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') : '';
		node.replaceWith(keep(`${caption ? `\n\n**${caption}**` : ''}${fence(node.text(), language)}`));
	}
	const imageMappings = [];
	for (const element of $('img').toArray()) {
		const node = $(element);
		let source = node.attr('src');
		const srcset = node.attr('srcset');
		if (!source) fail('Image without src.');
		if (allowPostMedia && source === externalScreenshot) {
			if (node.parent().is('a')) fail('External screenshot wrapping changed; review locally.');
			source = `${PREFIX}${externalScreenshotLocal}`;
			metrics.externalImagesLocalized++;
		}
		const mapped = await image(source);
		const replacement = replacements.get(mapped.original);
		const parent = node.parent().is('a') ? node.parent() : node;
		if (replacement) {
			metrics.imageCode++;
			const anchor = `legacy-code-${path.basename(mapped.original).replace(/\.[^.]+$/, '')}`;
			imageMappings.push({ from: mapped.original, to: `${postPath}#${anchor}`, disposition: 'code' });
			parent.replaceWith(keep(`<a id="${anchor}"></a>${fence(replacement.code, replacement.language)}`));
		} else {
			node.attr('src', mapped.url);
			node.removeAttr('srcset').removeAttr('sizes');
			if (parent.is('a')) parent.attr('href', mapped.url);
		}
		for (const candidate of (srcset ?? '').split(',').filter(Boolean)) {
			const variant = await image(candidate.trim().split(/\s+/)[0]);
			if (variant.original !== mapped.original) fail('Art-directed srcset requires explicit review.');
		}
	}
	for (const element of $('a[href]').toArray()) {
		const node = $(element);
		const href = node.attr('href');
		const upload = uploadPath(href);
		if (upload) {
			const mapped = await image(href);
			const replacement = replacements.get(mapped.original);
			const correctedContentDocument = allowPostMedia
				&& postPath === '/2020/02/15/reading-belgian-eid-in-uwp-using-smartcardreader/'
				&& node.text().trim() === 'Belgian eID content document'
				&& upload === '2020/02/Public_Belpic_Applet_v1-7_Ref_Manual-A01.pdf';
			node.attr('href', correctedContentDocument
				? (await image(`${PREFIX}2020/02/belgian_electronic_identity_card_content_v2.8.a.pdf`)).url
				: replacement ? `${postPath}#legacy-code-${path.basename(mapped.original).replace(/\.[^.]+$/, '')}` : mapped.url);
		} else node.attr('href', safeLink(href));
	}
	if (allowPostMedia && postPath === '/2020/02/15/reading-belgian-eid-in-uwp-using-smartcardreader/') {
		$.root().append($('<p>').append('Documentation source: the PDFs linked above are hosted locally for preservation. The source documents are available in the ',
			$('<a>').attr('href', 'https://github.com/Fedict/eid-mw').text('official Belgian eID middleware repository'), '.'));
	}
	const allowed = new Set(['html', 'head', 'body', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
		'em', 'strong', 'b', 'i', 's', 'del', 'u', 'a', 'img', 'figure', 'figcaption', 'br', 'hr',
		'ul', 'ol', 'li', 'blockquote', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td']);
	for (const element of $('*').toArray()) {
		if (!allowed.has(element.tagName)) fail('Unsupported HTML element; add a reviewed conversion.');
	}
	const prose = load($.html(), {}, false);
	prose('code').remove();
	if (/(?<![\w])\[(?:\/?[a-z][\w-]*)\](?!\()/.test(prose.text())) {
		fail('Unconverted shortcode candidate; review locally.');
	}
	const converter = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
	converter.use(gfm);
	converter.addRule('caption', {
		filter: 'figure',
		replacement: (content) => `\n\n${content.trim()}\n\n`,
	});
	let markdown = converter.turndown(preserveParagraphs($));
	if (/\[(?:\/?(?:caption|video|audio|gallery|embed|code|sourcecode)\b(?:\s+[a-z][\w-]*=[^\]]*)?|[a-z][\w-]*\s+[a-z][\w-]*=[^\]]*)\](?!\()/i.test(markdown)
		|| /wp-block|<!--\s*wp:|enlighter|crayon-/i.test(markdown)) fail('Unconverted WordPress artifact.');
	for (const [index, block] of blocks.entries()) markdown = markdown.replace(`MIGRATIONBLOCK${index}PLACEHOLDER`, block.trim());
	markdown = `${markdown.trim()}\n`;
	assertPrivateSafe(markdown, 'converted Markdown');
	return { markdown, metrics, imageMappings };
}

async function optionalRead(file) {
	try { return await readFile(file); } catch (error) {
		if (error.code === 'ENOENT') return null;
		throw error;
	}
}

async function safePath(root, relative) {
	if (path.isAbsolute(relative) || relative.split('/').some((part) => part === '..' || part === '.')) fail('Unsafe filesystem path.');
	const destination = path.join(root, relative);
	let ancestor = destination;
	while (true) {
		try {
			if ((await lstat(ancestor)).isSymbolicLink()) fail('Symlink input/output is not permitted.');
			if (await realpath(ancestor) !== ancestor) fail('Symlink input/output is not permitted.');
			break;
		} catch (error) {
			if (error.code !== 'ENOENT') throw error;
			ancestor = path.dirname(ancestor);
		}
	}
	return destination;
}

export function sanitizePostBody(html, id) {
	if (id !== 1247) return { html, privacyRedactions: 0 };
	let privacyRedactions = 0;
	const sanitized = html.replace(new RegExp(EMAIL.source, 'gi'), () => {
		privacyRedactions++;
		return '[email address omitted]';
	});
	if (privacyRedactions !== 2) fail('Expected two reviewed illustrative address occurrences in post 1247; review privacy locally.');
	return { html: sanitized, privacyRedactions };
}

export async function transformImage(input, original) {
	const metadata = await sharp(input, { failOn: 'warning' }).metadata();
	const width = Math.min(metadata.width, preferredWidths.get(original) ?? 1600);
	const animated = (metadata.pages ?? 1) > 1;
	const needsMetadataRemoval = metadata.exif || metadata.iptc || metadata.xmp || metadata.icc;
	let output;
	let outputName = original;
	if (animated && metadata.loop > 65535) {
		// GIF supports 65,536 plays, which WebP's loop field cannot represent.
		output = await sharp(input, { animated: true, failOn: 'warning', limitInputPixels: 512_000_000 })
			.resize({ width: Math.min(width, 600), withoutEnlargement: true }).gif({ effort: 10 }).toBuffer();
	} else if (animated) {
		outputName = original.replace(/\.[^.]+$/, '.webp');
		for (const quality of [85, 70, 55, 40]) {
			output = await sharp(input, { animated: true, failOn: 'warning', limitInputPixels: 512_000_000 }).resize({ width: Math.min(width, 600), withoutEnlargement: true })
				.webp({ quality, effort: 6, loop: metadata.loop ?? 0 }).toBuffer();
			if (output.length <= 500_000) break;
		}
	} else if (!needsMetadataRemoval && metadata.width <= width && input.length <= 500_000) output = input;
	else {
		const pipeline = sharp(input, { failOn: 'warning' }).resize({ width, withoutEnlargement: true });
		output = await (metadata.format === 'jpeg' ? pipeline.jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
			: metadata.format === 'webp' ? pipeline.webp({ quality: 90 }) : pipeline.png()).toBuffer();
		if (output.length > 500_000) {
			outputName = original.replace(/\.[^.]+$/, '.webp');
			for (const quality of [90, 80, 70, 60]) {
				output = await sharp(input, { failOn: 'warning' }).resize({ width, withoutEnlargement: true })
					.webp({ quality, effort: 6 }).toBuffer();
				if (output.length <= 500_000) break;
			}
		}
	}
	const measured = await sharp(output, { animated: true }).metadata();
	if (measured.width > 1600 || output.length > 500_000) fail('Image exceeds its 1600px/500000-byte budget after deterministic optimization.');
	if (animated) {
		if ((measured.pages ?? 1) < 2 || measured.loop !== metadata.loop
			|| measured.delay.reduce((sum, delay) => sum + delay, 0) !== metadata.delay.reduce((sum, delay) => sum + delay, 0)) {
			fail('Animation frames, loop or total timing were not preserved.');
		}
	}
	if (measured.exif || measured.iptc || measured.xmp || EMAIL.test(output.toString('latin1'))) {
		fail('Privacy finding in output image; no private value logged.');
	}
	return { output, outputName, measurements: {
		inputBytes: input.length, outputBytes: output.length, inputWidth: metadata.width,
		inputHeight: metadata.pageHeight ?? metadata.height, width: measured.width, height: measured.pageHeight ?? measured.height,
		inputFrames: metadata.pages ?? 1, frames: measured.pages ?? 1,
		durationMs: metadata.delay?.reduce((sum, delay) => sum + delay, 0) ?? 0,
		sha256: hash(output),
	} };
}

async function cachedImage(root, input, original) {
	const policy = 'sharp-0.35-still100-webp85-70-55-40-effort6-v1';
	const key = hash(`${policy}\n${original}\n${hash(input)}`);
	const metadataPath = await safePath(root, `_migration/post-media-cache/${key}.json`);
	const binaryPath = await safePath(root, `_migration/post-media-cache/${key}.bin`);
	const previous = await optionalRead(metadataPath);
	if (previous) {
		const stored = JSON.parse(previous);
		const output = await optionalRead(binaryPath);
		if (!output || hash(output) !== stored.measurements.sha256) fail('Local transformed-media cache is incomplete or modified; remove the affected cache entry and rerun.');
		return { ...stored, output };
	}
	const result = await transformImage(input, original);
	await mkdir(path.dirname(metadataPath), { recursive: true });
	await writeFile(binaryPath, result.output, { mode: 0o600 });
	await writeFile(metadataPath, json({ outputName: result.outputName, measurements: result.measurements }), { mode: 0o600 });
	return result;
}

export async function sanitizeDocument(input) {
	if (!input.subarray(0, 5).equals(Buffer.from('%PDF-'))) fail('Expected a PDF document.');
	let document;
	try {
		document = await PDFDocument.load(input, { updateMetadata: false });
	} catch {
		fail('PDF decoding failed; inspect the local document.');
	}
	if (!document.getPageCount()) fail('PDF document has no pages.');
	const info = document.context.trailerInfo.Info;
	if (info) document.context.delete(info);
	document.context.trailerInfo.Info = undefined;
	const metadata = document.catalog.get(PDFName.of('Metadata'));
	if (metadata instanceof PDFRef) document.context.delete(metadata);
	document.catalog.delete(PDFName.of('Metadata'));
	const output = Buffer.from(await document.save({ useObjectStreams: false }));
	if (EMAIL.test(output.toString('latin1'))) fail('Privacy finding in PDF document; no private value logged.');
	return { output, pages: document.getPageCount() };
}

export async function importPilot(options) {
	return importPosts({ ...options, all: false });
}

export async function importPosts({ root, sourceRoot, all = false }) {
	root = await realpath(root);
	if (await realpath(sourceRoot) !== sourceRoot) fail('Source directory must not be a symlink.');
	const entries = (await readdir(sourceRoot)).filter((file) => file.endsWith('.xml'));
	if (entries.length !== 1) fail('Expected one WXR XML file in the source directory.');
	const xml = await readFile(await safePath(sourceRoot, entries[0]), 'utf8');
	const channel = parseExport(xml);
	const published = array(channel.item).filter((item) =>
		text(item['wp:post_type']) === 'post' && text(item['wp:status']) === 'publish' && !text(item['wp:post_password']))
		.sort((a, b) => text(a.link).localeCompare(text(b.link), 'en'));
	const selected = all ? published : published.slice(0, 5);
	if (all && selected.length !== 62) fail('Expected exactly 62 published posts for the full post migration.');
	if (selected.slice(0, 5).length !== 5 || selected.slice(0, 5).some((item, index) => new URL(text(item.link)).pathname !== PILOT_PATHS[index])) {
		fail('Pilot selection changed; only the approved oldest five posts may be imported.');
	}
	const report = await readFile(path.join(root, 'IMAGE-CODE-EXTRACTION-REPORT.md'), 'utf8');
	const replacements = codeReplacements(report);
	const outputs = new Map();
	const mappings = new Map();
	const assets = new Map();
	const uploads = await safePath(sourceRoot, 'blog/wp-content/uploads');
	const image = async (url) => {
		safeLink(url);
		const relative = uploadPath(url);
		if (!relative) fail('External or unsupported asset; no network fetch was attempted.');
		const generated = [...assets.entries()].find(([, asset]) => asset.path === `${PREFIX}${relative}`);
		if (generated) return { original: generated[0], url: generated[1].path };
		const original = relative.replace(/-\d+x\d+(?=\.[^.]+$)/, '');
		if (original !== relative && !(await optionalRead(await safePath(uploads, relative)))) fail('Referenced variant is missing.');
		if (assets.has(original)) {
			const to = assets.get(original).path;
			if (relative !== original) mappings.set(`${PREFIX}${relative}`, { from: `${PREFIX}${relative}`, to, disposition: 'image' });
			return { original, url: to };
		}
		const file = await safePath(uploads, original);
		const input = await optionalRead(file);
		if (!input) fail(`Referenced original ${original} is missing; inspect the private source.`);
		let to = `${PREFIX}${original}`;
		if (relative !== original) mappings.set(`${PREFIX}${relative}`, { from: `${PREFIX}${relative}`, to, disposition: 'image' });
		if (!replacements.has(original) && !assets.has(original)) {
			let output;
			let measurements;
			if (all && documentLinks.has(original)) {
				const document = await sanitizeDocument(input);
				output = document.output;
				measurements = { inputBytes: input.length, outputBytes: output.length, sha256: hash(output), kind: 'document', pages: document.pages };
			} else if (all && /^2017\/12\/(?:DQ8BMqgWkAERely|DRAowkoXUAAceUg)\.mp4$/.test(original)) {
				output = input;
				measurements = { inputBytes: input.length, outputBytes: input.length, sha256: hash(input), kind: 'video' };
			} else {
				if (!/\.(?:jpe?g|png|gif|webp)$/i.test(original)) fail('Unsupported image format.');
				let transformed;
				try {
					transformed = all ? await cachedImage(root, input, original) : await transformImage(input, original);
				} catch (error) {
					if (error instanceof ImportError) fail(`Asset ${original}: ${error.message}`);
					fail(`Asset ${original}: image decoding/encoding failed (${error.code ?? error.name}); inspect the local image.`);
				}
				output = transformed.output;
				measurements = { ...transformed.measurements, kind: 'image' };
				to = `${PREFIX}${transformed.outputName}`;
			}
			if (to !== `${PREFIX}${original}`) mappings.set(`${PREFIX}${original}`, { from: `${PREFIX}${original}`, to, disposition: 'optimized-image' });
			if (relative !== original) mappings.set(`${PREFIX}${relative}`, { from: `${PREFIX}${relative}`, to, disposition: 'image' });
			if (outputs.has(`public${to}`)) fail(`Asset output collision for ${original}; review original/derivative names.`);
			outputs.set(`public${to}`, output);
			assets.set(original, { original, path: to, ...measurements });
		}
		return { original, url: to };
	};
	const posts = [];
	const ids = new Set();
	const postPaths = new Set();
	for (const item of selected) {
		const id = Number(text(item['wp:post_id']));
		if (!Number.isSafeInteger(id) || id <= 0 || ids.has(id)) fail('Invalid or duplicate legacy post ID.');
		ids.add(id);
		const postPath = new URL(text(item.link)).pathname;
		if (postPaths.has(postPath)) fail('Duplicate legacy post path.');
		postPaths.add(postPath);
		const { date, slug } = parsePostPath(postPath);
		const title = text(item.title);
		assertPrivateSafe(title, `post ${id} title`);
		const sanitized = all ? sanitizePostBody(text(item['content:encoded']), id)
			: { html: text(item['content:encoded']), privacyRedactions: 0 };
		let converted;
		try {
			converted = await convertMarkup(sanitized.html, {
				image, replacements, postPath, styledSnippet: id === 16,
				languageResolutions: all ? codeLanguageResolutions.get(id) ?? {} : {}, allowPostMedia: all,
			});
		} catch (error) {
			if (error instanceof ImportError) fail(`Post ${id}: ${error.message}`);
			throw error;
		}
		for (const mapping of converted.imageMappings) {
			mappings.set(`${PREFIX}${mapping.from}`, { ...mapping, from: `${PREFIX}${mapping.from}` });
			for (const [key, value] of mappings) {
				if (value.to === `${PREFIX}${mapping.from}`) mappings.set(key, { ...value, to: mapping.to, disposition: 'code' });
			}
		}
		const $ = load(sanitized.html, {}, false);
		$('script, ins, pre').remove();
		const description = $.text().replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180);
		if (!description) fail(`Empty description for post ${id}.`);
		const taxonomy = array(item.category);
		const categories = importTaxonomy(taxonomy, 'category');
		const tags = importTaxonomy(taxonomy, 'post_tag');
		const frontmatter = { title, description, pubDate: date,
			legacy: { id, path: postPath, taxonomySlugs: { categories: categories.slugs, tags: tags.slugs } },
			categories: categories.values, tags: tags.values };
		const codeRepositories = reviewedCodeRepositories(sanitized.html,
			all ? codeRepositorySelections.get(id) ?? [] : PILOT_CODE_REPOSITORIES.get(postPath) ?? []);
		if (codeRepositories.length) frontmatter.codeRepositories = codeRepositories;
		const thumbnail = array(item['wp:postmeta']).find((meta) => meta['wp:meta_key'] === '_thumbnail_id')?.['wp:meta_value'];
		if (thumbnail) {
			const attachment = array(channel.item).find((candidate) => text(candidate['wp:post_id']) === text(thumbnail));
			const attached = array(attachment?.['wp:postmeta']).find((meta) => meta['wp:meta_key'] === '_wp_attached_file')?.['wp:meta_value'];
			if (!attached) fail(`Missing featured-image attachment for post ${id}.`);
			const hero = await image(`${PREFIX}${text(attached)}`);
			if (replacements.has(hero.original)) fail('Code image cannot be used as a hero.');
			frontmatter.heroImage = hero.url;
		}
		const output = `src/content/blog/${date}-${slug}.md`;
		const markdown = `---\n${Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n${converted.markdown}`;
		assertPrivateSafe(markdown, `post ${id} output`);
		outputs.set(output, Buffer.from(markdown));
		posts.push({ id, path: postPath, file: output, codeRepositories, privacyRedactions: sanitized.privacyRedactions, ...converted.metrics });
	}
	const manifest = { version: 1, scope: all ? 'all-published-posts' : 'oldest-five-post-pilot', posts,
		assets: [...assets.values()].sort((a, b) => a.path.localeCompare(b.path, 'en')),
		aliases: [...mappings.values()].sort((a, b) => a.from.localeCompare(b.from, 'en')) };
	outputs.set(all ? 'src/data/migration-posts.json' : 'src/data/migration-pilot.json', Buffer.from(json(manifest)));
	const statePath = await safePath(root, '_migration/pilot/state.json');
	const previous = await optionalRead(statePath);
	const state = previous ? JSON.parse(previous) : { files: {} };
	if (all && state.files['src/data/migration-pilot.json']) {
		outputs.set('src/data/migration-pilot.json', await readFile(await safePath(root, 'src/data/migration-pilot.json')));
	}
	if (Object.keys(state.files).some((file) => !outputs.has(file))) fail('Owned output set changed; review removals explicitly.');
	for (const [relative, content] of outputs) {
		const destination = await safePath(root, relative);
		const existing = await optionalRead(destination);
		if (existing && (!state.files[relative] || state.files[relative] !== hash(existing))) {
			fail('Output collision or manually modified imported file; no outputs overwritten.');
		}
		if (content.length === 0) fail('Empty generated output.');
	}
	await mkdir(path.dirname(statePath), { recursive: true });
	for (const [relative, content] of outputs) {
		const destination = await safePath(root, relative);
		const existing = await optionalRead(destination);
		if (existing?.equals(content)) continue;
		await mkdir(path.dirname(destination), { recursive: true });
		await writeFile(destination, content);
	}
	await writeFile(statePath, json({ version: 1, sourceSha256: hash(xml),
		files: Object.fromEntries([...outputs].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([file, content]) => [file, hash(content)])) }), { mode: 0o600 });
	return manifest;
}

async function main() {
	const args = process.argv.slice(2);
	const all = args[0] === '--all-posts';
	if (all) args.shift();
	if (args.length && (args.length !== 2 || args[0] !== '--source')) fail('Usage: node scripts/migration-import.mjs [--all-posts] [--source /absolute/private/source]');
	const root = process.cwd();
	const sourceRoot = args[1] ? path.resolve(args[1]) : path.join(root, '_migration');
	execFileSync('git', ['check-ignore', '--quiet', '_migration/'], { cwd: root, stdio: 'pipe' });
	if (execFileSync('git', ['ls-files', '--', '_migration'], { cwd: root, encoding: 'utf8' }).trim()) fail('Private migration files are tracked.');
	const result = await importPosts({ root, sourceRoot, all });
	console.log(`Imported: ${result.posts.length} posts, ${result.assets.length} media assets, ${result.posts.reduce((sum, post) => sum + post.imageCode, 0)} code-image replacements. Stop for owner review.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	main().catch((error) => {
		console.error(error instanceof ImportError ? `Import failed: ${error.message}`
			: 'Import failed: parser/filesystem error. Inspect local inputs and run focused tests; no source values logged.');
		process.exitCode = 1;
	});
}
