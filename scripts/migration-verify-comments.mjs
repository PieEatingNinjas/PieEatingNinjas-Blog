import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { buildCommentTree } from '../src/lib/comments.ts';

const EXPECTED_COMMENTS = 196;
const EMAIL = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const TEXT_EXTENSIONS = new Set(['.astro', '.css', '.html', '.js', '.json', '.md', '.mdx', '.svg', '.ts', '.txt', '.xml']);
const ROOT = process.cwd();
const decodePercentGroups = (value) => value.replace(/(?:%[a-f0-9]{2})+/gi, (part) => {
	try {
		return decodeURIComponent(part);
	} catch {
		return part;
	}
});

function hasEmail(value) {
	let current = String(value);
	for (let pass = 0; pass < 4; pass++) {
		if (EMAIL.test(current)) return true;
		current = decodePercentGroups(current);
	}
	return false;
}

async function listTextFiles(directory) {
	const files = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const absolute = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...await listTextFiles(absolute));
		else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(absolute);
	}
	return files;
}

async function scanForEmails(directory) {
	let scanned = 0;
	for (const file of await listTextFiles(directory)) {
		scanned++;
		const content = await readFile(file, 'utf8');
		assert.equal(hasEmail(content), false, `Email privacy scan failed in ${path.relative(ROOT, file)}.`);
	}
	return scanned;
}

async function verify() {
	const posts = JSON.parse(await readFile(path.join(ROOT, 'src/data/migration-posts.json'), 'utf8'));
	assert.equal(posts.scope, 'all-published-posts');
	const archivesRoot = path.join(ROOT, 'src/data/comments');
	const archiveFiles = (await readdir(archivesRoot)).filter((file) => file.endsWith('.json')).sort();
	assert.equal(archiveFiles.length, posts.posts.length, 'Every imported post must have exactly one comment archive.');

	const seenCommentIds = new Set();
	let totalComments = 0;
	let authorCommentCount = 0;
	let nestedReplyCount = 0;
	let maximumThreadDepth = 0;
	for (const post of posts.posts) {
		const fileName = `${post.id}.json`;
		assert.ok(archiveFiles.includes(fileName), `Missing comment archive for legacy post ${post.id}.`);
		const archive = JSON.parse(await readFile(path.join(archivesRoot, fileName), 'utf8'));
		assert.deepEqual(Object.keys(archive).sort(), ['comments', 'legacyPostId', 'postPath', 'schemaVersion']);
		assert.equal(archive.schemaVersion, 1);
		assert.equal(archive.legacyPostId, post.id);
		assert.equal(archive.postPath, post.path);
		assert.ok(Array.isArray(archive.comments));
		const thread = buildCommentTree(archive.comments);
		assert.equal(thread.entries.length, archive.comments.length, 'Thread rendering must preserve every approved comment.');
		nestedReplyCount += thread.entries.filter((entry) => entry.depth > 0).length;
		maximumThreadDepth = Math.max(maximumThreadDepth, ...thread.entries.map((entry) => entry.depth));
		for (const comment of archive.comments) {
			assert.deepEqual(Object.keys(comment).sort(),
				['content', 'date', 'gravatarHash', 'id', 'name', 'parentId', 'website'].sort());
			assert.ok(Number.isSafeInteger(comment.id) && comment.id > 0);
			assert.ok(Number.isSafeInteger(comment.parentId) && comment.parentId >= 0);
			assert.equal(seenCommentIds.has(comment.id), false, 'Duplicate comment ID in generated archives.');
			seenCommentIds.add(comment.id);
			assert.equal(typeof comment.name, 'string');
			const isAuthor = comment.name.trim().toLowerCase() === 'pieeatingninjas';
			if (isAuthor) authorCommentCount++;
			assert.equal(typeof comment.date, 'string');
			assert.equal(typeof comment.content, 'string');
			assert.ok(comment.gravatarHash === null || /^[a-f0-9]{64}$/.test(comment.gravatarHash));
			if (comment.website !== null) {
				const website = new URL(comment.website, 'https://blog.pieeatingninjas.be');
				assert.ok(['http:', 'https:'].includes(website.protocol));
				assert.equal(Boolean(website.username || website.password), false);
				if (website.hostname === 'blog.pieeatingninjas.be' && !website.port) {
					assert.ok(comment.website.startsWith('/') && !comment.website.startsWith('//'));
				}
			}
			const $ = load(`<div>${comment.content}</div>`, {}, false);
			const allowedTags = new Set(['a', 'blockquote', 'br', 'code', 'del', 'em', 'li', 'ol', 'p', 'pre', 'strong', 'ul']);
			for (const element of $('div').first().find('*').toArray()) {
				assert.ok(allowedTags.has(element.tagName.toLowerCase()),
					`Unexpected sanitized tag on post ${post.id}, comment ${comment.id}: ${element.tagName}.`);
				for (const [attribute, value] of Object.entries(element.attribs)) {
					assert.ok(element.tagName.toLowerCase() === 'a' && ['href', 'title'].includes(attribute),
						'Unexpected attribute in sanitized comment HTML.');
					if (attribute === 'href') {
						const url = new URL(value);
						assert.ok(['http:', 'https:'].includes(url.protocol));
					}
				}
			}
			assert.equal(hasEmail(JSON.stringify(comment)), false, 'Email privacy scan failed in a comment record.');
		}
		totalComments += archive.comments.length;

		const route = post.path.replace(/^\/|\/$/g, '').split('/').join(path.sep);
		const htmlPath = path.join(ROOT, 'dist', route, 'index.html');
		const html = await readFile(htmlPath, 'utf8');
		const $ = load(html, {}, false);
		assert.equal($('#comments .legacy-comment').length, archive.comments.length,
			`Rendered count differs for legacy post ${post.id}.`);
		assert.equal($('#comments .author-badge').length, archive.comments.filter((comment) =>
			comment.name.trim().toLowerCase() === 'pieeatingninjas').length,
		`Author badge count differs for legacy post ${post.id}.`);
		for (const comment of archive.comments) {
			assert.equal($(`#comment-${comment.id}`).length, 1, `Missing rendered anchor for comment ${comment.id}.`);
		}
	}
	assert.equal(totalComments, EXPECTED_COMMENTS, 'Approved comment total differs from the accepted inventory baseline.');

	const report = JSON.parse(await readFile(path.join(ROOT, '_migration/comments/report.json'), 'utf8'));
	assert.equal(report.expectedApprovedCount, EXPECTED_COMMENTS);
	assert.equal(report.approvedSelectedCount, totalComments);
	assert.equal(report.approvedSourceCount, EXPECTED_COMMENTS, 'Approved source comments differ from the inventory baseline.');
	assert.equal(report.approvedExcludedContentCount, 0, 'Approved comments outside selected posts need reconciliation.');
	assert.equal(report.posts.length, posts.posts.length);
	assert.equal(report.threadIssues.length,
		report.threadIssues.filter((issue) => ['missing-parent', 'excluded-parent', 'cross-post-parent', 'unavailable-parent', 'cycle'].includes(issue.reason)).length);
	for (const directory of ['src', 'public', 'dist']) await scanForEmails(path.join(ROOT, directory));
	console.log(`Verified ${totalComments} static comments across ${posts.posts.length} posts; `
		+ `${authorCommentCount} author comments visibly identified; `
		+ `${nestedReplyCount} replies (maximum depth ${maximumThreadDepth}); `
		+ `${report.excludedCount} unapproved comments excluded; `
		+ `${report.threadIssues.length} thread relationship issues reconciled; `
		+ 'email scans passed in src/, public/ and dist/.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	verify().catch((error) => {
		console.error(`Comment verification failed: ${error.message}`);
		process.exitCode = 1;
	});
}
