import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { parseExport } from './migration-inventory.mjs';
import { buildCommentTree } from '../src/lib/comments.ts';

const ORIGIN = 'https://blog.pieeatingninjas.be';
const ORIGIN_URL = new URL(ORIGIN);
const EXPECTED_APPROVED_COMMENTS = 196;
const EMAIL = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const array = (value) => value === undefined ? [] : Array.isArray(value) ? value : [value];
const text = (value) => String(value?.['#text'] ?? value ?? '');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

export class CommentImportError extends Error {}

function fail(message) {
	throw new CommentImportError(message);
}

function positiveInteger(value, label, allowZero = false) {
	const source = text(value);
	if (!/^\d+$/.test(source) || !Number.isSafeInteger(Number(source))
		|| (allowZero ? Number(source) < 0 : Number(source) <= 0)) {
		fail(`Invalid ${label}.`);
	}
	return Number(source);
}

function decodePercentGroups(value) {
	return value.replace(/(?:%[a-f0-9]{2})+/gi, (part) => {
		try {
			return decodeURIComponent(part);
		} catch {
			return part;
		}
	});
}

function redactEmails(value) {
	const original = String(value);
	let candidate = original;
	let redactions = 0;
	for (let pass = 0; pass < 3; pass++) {
		const decoded = decodePercentGroups(candidate);
		let passRedactions = 0;
		const next = decoded.replace(EMAIL, () => {
			passRedactions++;
			redactions++;
			return '[redacted]';
		});
		if (passRedactions) {
			candidate = next;
			continue;
		}
		if (decoded === candidate) break;
		candidate = decoded;
	}
	return { value: redactions ? candidate : original, redactions };
}

function containsEmail(value) {
	let decoded = String(value);
	for (let pass = 0; pass < 4; pass++) {
		if (new RegExp(EMAIL).test(decoded)) return true;
		decoded = decodePercentGroups(decoded);
	}
	return false;
}

function safeWebsite(value) {
	const source = String(value).trim();
	if (!source || containsEmail(source)) return null;
	let url;
	try {
		url = new URL(source);
	} catch {
		return null;
	}
	if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
		|| containsEmail(url.href)
		|| [...url.searchParams.keys()].some((key) => /email|token|secret|password|auth|key/i.test(key))) {
		return null;
	}
	if (url.hostname === ORIGIN_URL.hostname && !url.port) {
		return `${url.pathname}${url.search}${url.hash}`;
	}
	return url.href;
}

function sanitizeCommentHtml(source) {
	const $ = load(String(source), {}, false);
	const root = $.root();
	const discardedElements = 'script,style,iframe,object,embed,svg,math,template,noscript,form,input,button,textarea,select,option,link,meta,base';
	$(discardedElements).remove();
	root.contents().filter((_, node) => node.type === 'comment').remove();
	$('*').contents().filter((_, node) => node.type === 'comment').remove();

	let privacyRedactions = 0;
	const allowed = new Set(['a', 'blockquote', 'br', 'code', 'del', 'em', 'li', 'ol', 'p', 'pre', 'strong', 'ul']);
	for (const element of $('*').toArray()) {
		const tag = element.tagName.toLowerCase();
		if (!allowed.has(tag)) {
			$(element).replaceWith($(element).contents());
			continue;
		}
		for (const attribute of Object.keys(element.attribs)) {
			if (tag !== 'a' || !['href', 'title'].includes(attribute)) {
				$(element).removeAttr(attribute);
			}
		}
		const title = $(element).attr('title');
		if (title) {
			const redacted = redactEmails(title);
			privacyRedactions += redacted.redactions;
			$(element).attr('title', redacted.value);
		}
		const href = $(element).attr('href');
		if (href) {
			let safe = false;
			try {
				const url = new URL(href, ORIGIN);
				safe = ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
					&& !containsEmail(href) && !containsEmail(url.href)
					&& ![...url.searchParams.keys()].some((key) => /email|token|secret|password|auth|key/i.test(key));
				if (safe) $(element).attr('href', url.href);
			} catch {
				safe = false;
			}
			if (!safe) $(element).removeAttr('href');
		}
	}

	for (const node of root.find('*').contents().toArray()) {
		if (node.type !== 'text') continue;
		const redacted = redactEmails(node.data ?? '');
		privacyRedactions += redacted.redactions;
		node.data = redacted.value;
	}

	const textContent = root.text();
	const redactedText = redactEmails(textContent);
	privacyRedactions += redactedText.redactions;
	if (redactedText.value !== textContent) root.empty().text(redactedText.value);

	const html = root.html() ?? '';
	if (containsEmail(html)) fail('Comment content failed the privacy check; no private value logged.');
	return { html, privacyRedactions };
}

export function sanitizeLegacyComment(comment) {
	const nameResult = load(text(comment['wp:comment_author']), {}, false).text().trim();
	const sanitizedName = redactEmails(nameResult);
	const sanitizedContent = sanitizeCommentHtml(text(comment['wp:comment_content']));
	const email = text(comment['wp:comment_author_email']).trim().toLowerCase();
	const website = safeWebsite(text(comment['wp:comment_author_url']));
	const date = redactEmails(text(comment['wp:comment_date']).trim());
	const result = {
		id: positiveInteger(comment['wp:comment_id'], 'comment ID'),
		parentId: positiveInteger(comment['wp:comment_parent'] ?? '0', 'comment parent ID', true),
		name: sanitizedName.value || 'Anonymous',
		website,
		gravatarHash: email ? hash(email) : null,
		date: date.value,
		content: sanitizedContent.html,
	};
	const serialized = JSON.stringify(result);
	if (containsEmail(serialized)) fail('Comment failed the privacy check; no private value logged.');
	return {
		comment: result,
		privacyRedactions: sanitizedName.redactions + date.redactions + sanitizedContent.privacyRedactions,
		websiteOmittedForPrivacy: Boolean(text(comment['wp:comment_author_url']).trim() && !website
			&& containsEmail(text(comment['wp:comment_author_url']))),
	};
}

function postPath(item) {
	const pathName = new URL(text(item.link)).pathname;
	if (!/^\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/$/.test(pathName)) fail('Published post has an unsupported permalink.');
	return pathName;
}

function sortComments(comments) {
	return comments.toSorted((a, b) => a.date.localeCompare(b.date, 'en') || a.id - b.id);
}

function approved(value) {
	return text(value).trim() === '1';
}

function createArchives(channel, postManifest) {
	if (postManifest?.scope !== 'all-published-posts' || !Array.isArray(postManifest.posts)) {
		fail('The approved full post import manifest is missing; import posts first.');
	}
	const manifestPosts = new Map(postManifest.posts.map((post) => [post.id, post.path]));
	if (manifestPosts.size !== postManifest.posts.length || manifestPosts.size !== 62) {
		fail('The approved full post import manifest has unexpected post IDs.');
	}

	const sourcePosts = array(channel.item).filter((item) => text(item['wp:post_type']) === 'post'
		&& text(item['wp:status']) === 'publish' && !text(item['wp:post_password']));
	const sourceById = new Map(sourcePosts.map((item) => [positiveInteger(item['wp:post_id'], 'post ID'), item]));
	if (sourceById.size !== sourcePosts.length || sourceById.size !== manifestPosts.size) {
		fail('The source post IDs do not match the approved post import.');
	}
	for (const [id, pathName] of manifestPosts) {
		const item = sourceById.get(id);
		if (!item || postPath(item) !== pathName) fail('The source post paths do not match the approved post import.');
	}

	const allComments = [];
	for (const item of array(channel.item)) {
		const postId = positiveInteger(item['wp:post_id'], 'post ID');
		for (const comment of array(item['wp:comment'])) {
			allComments.push({
				id: positiveInteger(comment['wp:comment_id'], 'comment ID'),
				parentId: positiveInteger(comment['wp:comment_parent'] ?? '0', 'comment parent ID', true),
				postId,
				approved: approved(comment['wp:comment_approved']),
			});
		}
	}
	if (new Set(allComments.map((comment) => comment.id)).size !== allComments.length) {
		fail('Duplicate WordPress comment IDs were found.');
	}
	const sourceCommentById = new Map(allComments.map((comment) => [comment.id, comment]));

	const archives = [];
	const audit = {
		sourceCommentCount: allComments.length,
		approvedSourceCount: allComments.filter((comment) => comment.approved).length,
		excludedCount: 0,
		approvedSelectedCount: 0,
		approvedExcludedContentCount: 0,
		privacyRedactions: 0,
		websiteOmissions: 0,
		posts: [],
		threadIssues: [],
	};
	for (const [id, item] of [...sourceById].sort(([a], [b]) => a - b)) {
		const archiveComments = [];
		for (const raw of array(item['wp:comment'])) {
			if (!approved(raw['wp:comment_approved'])) {
				audit.excludedCount++;
				continue;
			}
			const sanitized = sanitizeLegacyComment(raw);
			archiveComments.push(sanitized.comment);
			audit.privacyRedactions += sanitized.privacyRedactions;
			if (sanitized.websiteOmittedForPrivacy) audit.websiteOmissions++;
		}
		audit.approvedSelectedCount += archiveComments.length;
		const tree = buildCommentTree(archiveComments);
		const archivePath = manifestPosts.get(id);
		for (const comment of archiveComments) {
			if (!comment.parentId) continue;
			const parent = sourceCommentById.get(comment.parentId);
			let reason;
			if (!parent) reason = 'missing-parent';
			else if (!parent.approved) reason = 'excluded-parent';
			else if (parent.postId !== id) reason = 'cross-post-parent';
			if (reason) audit.threadIssues.push({ postId: id, commentId: comment.id, parentId: comment.parentId, reason });
		}
		for (const commentId of tree.orphanedCommentIds) {
			if (!audit.threadIssues.some((issue) => issue.postId === id && issue.commentId === commentId)) {
				audit.threadIssues.push({ postId: id, commentId, parentId: archiveComments.find((comment) => comment.id === commentId).parentId, reason: 'unavailable-parent' });
			}
		}
		for (const cycle of tree.cycles) {
			audit.threadIssues.push({ postId: id, rootId: cycle[0], commentIds: cycle, reason: 'cycle' });
		}
		archives.push({
			output: `src/data/comments/${id}.json`,
			data: {
				schemaVersion: 1,
				legacyPostId: id,
				postPath: archivePath,
				comments: sortComments(archiveComments),
			},
		});
		audit.posts.push({ id, path: archivePath, comments: archiveComments.length });
	}
	audit.approvedExcludedContentCount = audit.approvedSourceCount - audit.approvedSelectedCount;
	return { archives, audit };
}

async function safePath(root, relative) {
	const destination = path.resolve(root, relative);
	if (!destination.startsWith(`${root}${path.sep}`)) fail('Output path escapes the repository.');
	let ancestor = destination;
	while (true) {
		try {
			if ((await lstat(ancestor)).isSymbolicLink() || await realpath(ancestor) !== ancestor) {
				fail('Symlink input/output is not permitted.');
			}
			break;
		} catch (error) {
			if (error.code !== 'ENOENT') throw error;
			const parent = path.dirname(ancestor);
			if (parent === ancestor) fail('Output path has no existing parent.');
			ancestor = parent;
		}
	}
	return destination;
}

async function optionalRead(file) {
	try {
		return await readFile(file);
	} catch (error) {
		if (error.code === 'ENOENT') return null;
		throw error;
	}
}

export async function importLegacyComments({ root, sourceRoot, expectedApproved = EXPECTED_APPROVED_COMMENTS }) {
	root = await realpath(root);
	if (await realpath(sourceRoot) !== sourceRoot) fail('Source directory must not be a symlink.');
	const exports = (await readdir(sourceRoot)).filter((file) => file.endsWith('.xml'));
	if (exports.length !== 1) fail('Expected one WXR XML file in the source directory.');
	const xml = await readFile(await safePath(sourceRoot, exports[0]), 'utf8');
	const postsPath = await safePath(root, 'src/data/migration-posts.json');
	const postManifest = JSON.parse(await readFile(postsPath, 'utf8'));
	const { archives, audit } = createArchives(parseExport(xml), postManifest);
	if (audit.approvedSelectedCount !== expectedApproved) {
		fail(`Approved selected-comment count mismatch: expected ${expectedApproved}, found ${audit.approvedSelectedCount}.`);
	}
	const outputs = new Map(archives.map(({ output, data }) => [output, Buffer.from(json(data))]));
	if (outputs.size !== postManifest.posts.length) fail('Per-post comment archive coverage is incomplete.');
	const statePath = await safePath(root, '_migration/comments/state.json');
	const previous = await optionalRead(statePath);
	const state = previous ? JSON.parse(previous) : { files: {} };
	if (Object.keys(state.files ?? {}).some((file) => !outputs.has(file))) {
		fail('Owned comment output set changed; review removals explicitly.');
	}
	for (const [relative, content] of outputs) {
		const existing = await optionalRead(await safePath(root, relative));
		if (existing && (!state.files?.[relative] || state.files[relative] !== hash(existing))) {
			fail('Comment output collision or manually modified file; no outputs overwritten.');
		}
		if (containsEmail(content.toString('utf8'))) fail('Generated comment archive failed the privacy check; no private value logged.');
	}
	const reportPath = await safePath(root, '_migration/comments/report.json');
	const report = {
		version: 1,
		sourceSha256: hash(xml),
		expectedApprovedCount: expectedApproved,
		...audit,
	};
	const reportBytes = Buffer.from(json(report));
	if (containsEmail(reportBytes.toString('utf8'))) fail('Private comment audit failed the privacy check; no private value logged.');
	await mkdir(path.dirname(statePath), { recursive: true });
	for (const [relative, content] of outputs) {
		const destination = await safePath(root, relative);
		const existing = await optionalRead(destination);
		if (existing?.equals(content)) continue;
		await mkdir(path.dirname(destination), { recursive: true });
		await writeFile(destination, content);
	}
	await writeFile(reportPath, reportBytes, { mode: 0o600 });
	await writeFile(statePath, json({
		version: 1,
		sourceSha256: hash(xml),
		files: Object.fromEntries([...outputs].sort(([a], [b]) => a.localeCompare(b, 'en'))
			.map(([file, content]) => [file, hash(content)])),
	}), { mode: 0o600 });
	return { archiveCount: outputs.size, ...audit };
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length && (args.length !== 2 || args[0] !== '--source')) {
		fail('Usage: npm run migration:comments -- [--source /absolute/private/source]');
	}
	const root = process.cwd();
	const sourceRoot = args[1] ? path.resolve(args[1]) : path.join(root, '_migration');
	execFileSync('git', ['check-ignore', '--quiet', '_migration/'], { cwd: root, stdio: 'pipe' });
	if (execFileSync('git', ['ls-files', '--', '_migration'], { cwd: root, encoding: 'utf8' }).trim()) {
		fail('Private migration files are tracked.');
	}
	const result = await importLegacyComments({ root, sourceRoot });
	console.log(`Imported ${result.approvedSelectedCount} approved comments across ${result.archiveCount} posts; `
		+ `${result.threadIssues.length} thread relationship issues; ${result.privacyRedactions} private-value redactions. `
		+ 'Source email addresses and private metadata were not retained.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	main().catch((error) => {
		console.error(error instanceof CommentImportError ? `Comment import failed: ${error.message}`
			: 'Comment import failed: parser/filesystem error. Inspect local inputs; no source values logged.');
		process.exitCode = 1;
	});
}
