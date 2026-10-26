import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { load } from 'cheerio';
import { test } from 'node:test';
import { buildCommentTree } from '../src/lib/comments.ts';
import { importLegacyComments, sanitizeLegacyComment } from './migration-comments.mjs';

const origin = 'https://blog.pieeatingninjas.be';
const postPath = (index) => `/2020/01/${String(index).padStart(2, '0')}/synthetic-${index}/`;
const element = (name, content) => `<${name}><![CDATA[${content}]]></${name}>`;
const comment = ({
	id, parent = 0, approved = '1', name = 'Synthetic reader', email = '', website = '', body = 'Synthetic comment',
}) => `<wp:comment>${element('wp:comment_id', id)}${element('wp:comment_parent', parent)}
	${element('wp:comment_approved', approved)}${element('wp:comment_author', name)}
	${element('wp:comment_author_email', email)}${element('wp:comment_author_url', website)}
	${element('wp:comment_date', '2020-01-01 12:00:00')}${element('wp:comment_content', body)}</wp:comment>`;
const item = (id, comments = '') => `<item>${element('wp:post_id', id)}${element('wp:post_type', 'post')}
	${element('wp:status', 'publish')}${element('wp:post_password', '')}
	${element('link', `${origin}${postPath(id)}`)}${comments}</item>`;
const wxr = (items) => `<?xml version="1.0"?><rss version="2.0"
	xmlns:wp="http://wordpress.org/export/1.2/"><channel><wp:wxr_version>1.2</wp:wxr_version>${items}</channel></rss>`;

test('hashes normalized synthetic email in memory and redacts emails from name, body and unsafe links', () => {
	const result = sanitizeLegacyComment({
		'wp:comment_id': '10',
		'wp:comment_parent': '0',
		'wp:comment_author': 'Reader <strong>reader@example.test</strong>',
		'wp:comment_author_email': '  Reader@Example.Test  ',
		'wp:comment_author_url': 'https://reader.example.test/profile',
		'wp:comment_date': '2020-01-01 12:00:00',
		'wp:comment_content': '<p>Contact reader&#64;example.test <a href="javascript:alert(1)" onclick="run()">safe text</a></p>',
	});
	assert.equal(result.comment.gravatarHash,
		createHash('sha256').update('reader@example.test').digest('hex'));
	assert.equal(result.comment.name, 'Reader [redacted]');
	assert.equal(result.comment.website, 'https://reader.example.test/profile');
	assert.match(result.comment.content, /Contact \[redacted\]/);
	assert.doesNotMatch(result.comment.content, /javascript:|onclick|example\.test/);
	assert.equal(result.privacyRedactions, 2);
	assert.equal(result.websiteOmittedForPrivacy, false);
});

test('strips executable HTML and unsafe URL schemes while retaining allowlisted markup', () => {
	const { comment: result } = sanitizeLegacyComment({
		'wp:comment_id': '11',
		'wp:comment_parent': '0',
		'wp:comment_author': 'Synthetic',
		'wp:comment_author_email': '',
		'wp:comment_author_url': 'javascript:alert(1)',
		'wp:comment_date': '2020-01-01 12:00:00',
		'wp:comment_content': '<p class="x" style="color:red">Hello <em>reader</em>.</p><script>steal()</script><iframe>frame</iframe><a href="data:text/html,bad">link</a><img src=x onerror=bad>',
	});
	assert.equal(result.website, null);
	assert.match(result.content, /<p>Hello <em>reader<\/em>\.<\/p>/);
	assert.doesNotMatch(result.content, /script|steal|iframe|data:|img|onerror|style=|class=/);
});

test('rewrites the blog own-domain website to a root-relative path', () => {
	const { comment: result } = sanitizeLegacyComment({
		'wp:comment_id': '12',
		'wp:comment_parent': '0',
		'wp:comment_author': 'Synthetic',
		'wp:comment_author_email': '',
		'wp:comment_author_url': 'http://blog.pieeatingninjas.be/2016/09/19/uwp-simple-pdf-viewer/',
		'wp:comment_date': '2020-01-01 12:00:00',
		'wp:comment_content': 'Synthetic comment',
	});
	assert.equal(result.website, '/2016/09/19/uwp-simple-pdf-viewer/');
});

test('redacts URL-encoded embedded emails and omits email-bearing websites', () => {
	const { comment: result, privacyRedactions, websiteOmittedForPrivacy } = sanitizeLegacyComment({
		'wp:comment_id': '13',
		'wp:comment_parent': '0',
		'wp:comment_author': 'reader%40example.test',
		'wp:comment_author_email': 'reader@example.test',
		'wp:comment_author_url': 'https://reader.example.test/?email=reader%40example.test',
		'wp:comment_date': '2020-01-01 12:00:00',
		'wp:comment_content': '<p>reader%40example.test</p><a href="mailto:reader%40example.test">email link</a>',
	});
	assert.equal(result.name, '[redacted]');
	assert.equal(result.website, null);
	assert.equal(websiteOmittedForPrivacy, true);
	assert.equal(privacyRedactions, 2);
	assert.doesNotMatch(JSON.stringify(result), /reader|example\.test|%40/);
	assert.doesNotMatch(result.content, /mailto:/);
});

test('builds a stable nested thread and roots missing-parent and cyclic replies without dropping them', () => {
	const comments = [
		{ id: 1, parentId: 0, date: '2020-01-01', name: 'One', content: '' },
		{ id: 2, parentId: 1, date: '2020-01-02', name: 'Two', content: '' },
		{ id: 3, parentId: 2, date: '2020-01-03', name: 'Three', content: '' },
		{ id: 4, parentId: 99, date: '2020-01-04', name: 'Orphan', content: '' },
		{ id: 5, parentId: 6, date: '2020-01-05', name: 'Cycle A', content: '' },
		{ id: 6, parentId: 5, date: '2020-01-06', name: 'Cycle B', content: '' },
		{ id: 7, parentId: 6, date: '2020-01-07', name: 'Cycle reply', content: '' },
	];
	const tree = buildCommentTree(comments);
	assert.deepEqual(tree.entries.map(({ comment: item, depth, parentId, cycleRoot }) =>
		[item.id, depth, parentId, cycleRoot]), [
		[1, 0, 0, false], [2, 1, 1, false], [3, 2, 2, false], [4, 0, 0, false],
		[5, 0, 0, true], [6, 1, 5, false], [7, 2, 6, false],
	]);
	assert.deepEqual(tree.orphanedCommentIds, [4]);
	assert.deepEqual(tree.cycles, [[5, 6]]);
	assert.equal(tree.entries.length, comments.length);
});

test('imports one JSON archive per approved post, preserves orphan IDs, excludes unapproved content, and is rerunnable', async (t) => {
	const root = await mkdtemp(path.join(os.tmpdir(), 'blog-comments-test-'));
	t.after(() => rm(root, { recursive: true, force: true }));
	const sourceRoot = path.join(root, 'private-source');
	await mkdir(path.join(root, 'src/data'), { recursive: true });
	await mkdir(sourceRoot);
	const posts = Array.from({ length: 62 }, (_, index) => ({
		id: index + 1,
		path: postPath(index + 1),
	}));
	await writeFile(path.join(root, 'src/data/migration-posts.json'), JSON.stringify({
		scope: 'all-published-posts',
		posts,
	}));
	const comments = comment({
		id: 101,
		name: 'Synthetic author',
		email: '  Synthetic@Example.Test ',
		website: 'https://synthetic.example.test',
		body: '<p>Approved reply with <strong>markup</strong>.</p>',
	}) + comment({ id: 102, parent: 101, approved: '0', body: 'Excluded parent text.' })
		+ comment({ id: 103, parent: 102, body: 'Approved reply to excluded parent.' });
	await writeFile(path.join(sourceRoot, 'synthetic.xml'), wxr(posts.map(({ id }) =>
		item(id, id === 1 ? comments : '')).join('')));

	const imported = await importLegacyComments({ root, sourceRoot, expectedApproved: 2 });
	assert.equal(imported.archiveCount, 62);
	assert.equal(imported.approvedSelectedCount, 2);
	assert.equal(imported.excludedCount, 1);
	assert.equal(imported.threadIssues.length, 1);
	assert.equal(imported.threadIssues[0].reason, 'excluded-parent');
	const firstPath = path.join(root, 'src/data/comments/1.json');
	const archive = JSON.parse(await readFile(firstPath, 'utf8'));
	assert.equal(archive.comments.length, 2);
	assert.equal(archive.comments[1].parentId, 102);
	assert.equal(archive.comments[0].gravatarHash,
		createHash('sha256').update('synthetic@example.test').digest('hex'));
	assert.doesNotMatch(await readFile(firstPath, 'utf8'), /Synthetic@Example\.Test|192\.0\.2\.1|Excluded parent text/);
	assert.deepEqual(Object.keys(archive.comments[0]).sort(),
		['id', 'parentId', 'name', 'website', 'gravatarHash', 'date', 'content'].sort());
	assert.deepEqual(await importLegacyComments({ root, sourceRoot, expectedApproved: 2 }), imported);

	await writeFile(firstPath, `${await readFile(firstPath, 'utf8')}manual edit`);
	await assert.rejects(importLegacyComments({ root, sourceRoot, expectedApproved: 2 }),
		/Comment output collision or manually modified file/);
});

test('renders sanitized content as inert approved HTML', () => {
	const { comment: result } = sanitizeLegacyComment({
		'wp:comment_id': '12',
		'wp:comment_parent': '0',
		'wp:comment_author': 'Reader',
		'wp:comment_author_email': '',
		'wp:comment_author_url': '',
		'wp:comment_date': '2020-01-01 12:00:00',
		'wp:comment_content': '<p>Safe <strong>HTML</strong>.</p><script>bad()</script>',
	});
	const $ = load(`<div>${result.content}</div>`, {}, false);
	assert.equal($('script').length, 0);
	assert.equal($('strong').text(), 'HTML');
	assert.equal($('div').text(), 'Safe HTML.');
});
