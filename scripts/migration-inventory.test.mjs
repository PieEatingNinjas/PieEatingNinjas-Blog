import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import sharp from 'sharp';
import {
	acceptanceFailures, classify, createInventory, parseExport, reportBaseline, uploadPath,
} from './migration-inventory.mjs';

const origin = 'https://blog.pieeatingninjas.be';
const postPath = '/2020/01/02/synthetic-post/';
const image = '2020/01/synthetic.png';
const baseline = {
	originals: [image], codeImages: [], optimization: [], unused: [], mixed: [], console: [],
};
const value = (key, content) => `<${key}><![CDATA[${content}]]></${key}>`;
const meta = (key, content) => `<wp:postmeta>${value('wp:meta_key', key)}${value('wp:meta_value', content)}</wp:postmeta>`;
function item({
	id = 1, type = 'post', status = 'publish', slug = 'synthetic-post', url = `${origin}${postPath}`,
	html = '', password = '', extra = '',
} = {}) {
	return `<item>${value('wp:post_id', id)}${value('wp:post_type', type)}${value('wp:status', status)}
	${value('wp:post_name', slug)}${value('link', url)}${value('wp:post_password', password)}
	${value('wp:post_date', '2020-01-02 23:30:00')}${value('wp:post_date_gmt', '2020-01-03 04:30:00')}
	${value('content:encoded', html)}${extra}</item>`;
}
function comment({ id = 10, parent = 0, approved = '1', body = 'Synthetic comment', website = '', email = '' } = {}) {
	return `<wp:comment>${value('wp:comment_id', id)}${value('wp:comment_parent', parent)}
	${value('wp:comment_approved', approved)}${value('wp:comment_content', body)}
	${value('wp:comment_author_email', email)}${value('wp:comment_author_url', website)}
	${value('wp:comment_author_IP', '192.0.2.1')}</wp:comment>`;
}
const wxr = (items, terms = '') => `<?xml version="1.0"?><rss version="2.0"
	xmlns:wp="http://wordpress.org/export/1.2/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
	<channel><wp:wxr_version>1.2</wp:wxr_version>${terms}${items}</channel></rss>`;
const attachment = () => item({
	id: 2, type: 'attachment', status: 'inherit', slug: 'synthetic-image',
	url: `${origin}/?attachment_id=2`,
	extra: meta('_wp_attached_file', image) + meta('_wp_attachment_metadata',
		'a:2:{s:4:"file";s:21:"2020/01/synthetic.png";s:5:"sizes";a:1:{s:5:"small";a:1:{s:4:"file";s:19:"synthetic-20x10.png";}}}'),
});

async function fixture(t) {
	const root = await mkdtemp(path.join(os.tmpdir(), 'blog-inventory-test-'));
	t.after(() => rm(root, { recursive: true, force: true }));
	await mkdir(path.join(root, '2020/01'), { recursive: true });
	const png = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#ffffff' } }).png().toBuffer();
	await writeFile(path.join(root, image), png);
	await writeFile(path.join(root, '2020/01/synthetic-20x10.png'), png);
	return root;
}

test('WXR validation rejects malformed XML, entity declarations, and other export versions', () => {
	assert.throws(() => parseExport('<rss><channel></rss>'), /Invalid WordPress XML/);
	assert.throws(() => parseExport('<!DOCTYPE rss><rss/>'), /DOCTYPE/);
	assert.throws(() => parseExport('<rss><channel><wp:wxr_version>1.1</wp:wxr_version></channel></rss>'), /WXR 1.2/);
});

test('selection excludes drafts, protected/private content, placeholders and WordPress infrastructure', () => {
	const check = (type, status, slug = '', password = '') => classify({
		'wp:post_type': type, 'wp:status': status, 'wp:post_name': slug, 'wp:post_password': password,
	});
	assert.equal(check('post', 'publish').included, true);
	assert.equal(check('post', 'draft').reason, 'draft-post');
	assert.equal(check('post', 'publish', '', 'synthetic-password').reason, 'password-protected');
	assert.equal(check('post', 'private').included, false);
	assert.equal(check('page', 'private', 'about').reason, 'private-about-review-required');
	assert.equal(check('page', 'private', 'book').included, false);
	assert.equal(check('page', 'private', 'home').reason, 'placeholder-page');
	assert.equal(check('page', 'publish', 'unselected').included, false);
	assert.equal(check('custom_css', 'publish').included, false);
});

test('upload mapping handles HTTP, root-relative URLs, Jetpack and encoding without remote crawling', () => {
	assert.equal(uploadPath(`http://blog.pieeatingninjas.be/wp-content/uploads/${image}?w=80`), image);
	assert.equal(uploadPath(`/wp-content/uploads/${image}`), image);
	assert.equal(uploadPath(`https://i0.wp.com/blog.pieeatingninjas.be/wp-content/uploads/${image}?resize=20,10`), image);
	assert.equal(uploadPath('https://i0.wp.com/other.invalid/wp-content/uploads/2020/01/example.png'), null);
	assert.equal(uploadPath('https://other.invalid/wp-content/uploads/2020/01/example.png'), null);
	assert.equal(uploadPath('javascript:alert(1)'), null);
	assert.equal(uploadPath('https://identity%40example.invalid@blog.pieeatingninjas.be/wp-content/uploads/2020/01/a.png'), null);
	assert.equal(uploadPath('/wp-content/uploads/2020/01/identity%40example.invalid.png'), null);
	assert.throws(() => uploadPath('/wp-content/uploads/2020/01/a%2Fb.png'), /Unsafe/);
	assert.equal(uploadPath('/wp-content/uploads/2020/01/bad%ZZ.png'), null);
});

test('inventory is deterministic, deduplicates originals, covers aliases, featured images, srcset and Jetpack', async (t) => {
	const uploadsRoot = await fixture(t);
	const html = `<a href="${origin}/wp-content/uploads/${image}"><img
		src="https://i0.wp.com/blog.pieeatingninjas.be/wp-content/uploads/2020/01/synthetic-20x10.png?w=20"
		srcset="/wp-content/uploads/2020/01/synthetic-20x10.png 20w, /wp-content/uploads/${image} 40w"></a>`;
	const xml = wxr(item({ html, extra: meta('_thumbnail_id', '2') }) + attachment());
	const first = await createInventory({ xml, uploadsRoot, baseline });
	const second = await createInventory({ xml, uploadsRoot, baseline });
	assert.deepEqual(first, second);
	assert.equal(first.inventory.assets.length, 1);
	assert.equal(first.inventory.imageReferences.length, 5);
	assert.equal(first.inventory.assets[0].width, 40);
	assert.equal(first.inventory.assets[0].height, 20);
	assert.ok(first.inventory.assets[0].sha256);
	assert.equal(first.inventory.issues.length, 0);
	assert.ok(first.manifest.urls.some((entry) => entry.source === '/wp-content/uploads/2020/01/synthetic-20x10.png'
		&& entry.disposition === 'retain-file-alias-proposed' && entry.approval === 'pending'));
	for (const reference of first.inventory.imageReferences) {
		assert.ok(first.manifest.urls.some((entry) => entry.source === reference.source));
	}
	for (const totals of Object.values(first.inventory.counts)) {
		assert.equal(totals.total, totals.included + totals.excluded);
	}
});

test('permalink dates and distinct taxonomy slugs are preserved without UTC conversion', async (t) => {
	const uploadsRoot = await fixture(t);
	const terms = `<wp:category><wp:term_id>3</wp:term_id><wp:category_nicename>shared</wp:category_nicename>
		<wp:cat_name>Synthetic category</wp:cat_name></wp:category>
		<wp:tag><wp:term_id>4</wp:term_id><wp:tag_slug>shared</wp:tag_slug><wp:tag_name>Synthetic tag</wp:tag_name></wp:tag>`;
	const extra = '<category domain="category" nicename="shared">Synthetic category</category>'
		+ '<category domain="post_tag" nicename="shared">Synthetic tag</category>';
	const { inventory, manifest } = await createInventory({ xml: wxr(item({ extra }), terms), uploadsRoot, baseline });
	assert.equal(inventory.records[0].permalinkDate, '2020-01-02');
	assert.equal(inventory.records[0].gmtDate, '2020-01-03 04:30:00');
	assert.equal(inventory.records[0].terms.length, 2);
	assert.ok(manifest.urls.some((entry) => entry.source === '/category/shared/'));
	assert.ok(manifest.urls.some((entry) => entry.source === '/tag/shared/'));
	assert.ok(manifest.urls.some((entry) => entry.source === '/?p=1' && entry.destination === postPath));
});

test('private About is only a proposed page; old 404 slug maps to genuine 404 output', async (t) => {
	const uploadsRoot = await fixture(t);
	const xml = wxr(item({ type: 'page', status: 'private', slug: 'about', url: `${origin}/about/` })
		+ item({ id: 3, type: 'page', slug: '404-error-content-does-not-exist-anymore',
			url: `${origin}/404-error-content-does-not-exist-anymore/` }));
	const result = await createInventory({ xml, uploadsRoot, baseline });
	assert.equal(result.inventory.counts.pages.included, 2);
	assert.ok(result.manifest.urls.some((entry) => entry.source === '/about/' && entry.approval === 'pending'));
	assert.ok(result.manifest.urls.some((entry) => entry.source === '/404-error-content-does-not-exist-anymore/'
		&& entry.destination === '/404.html'));
});

test('old slug encoding is preserved and excluded-only assets are never selected', async (t) => {
	const uploadsRoot = await fixture(t);
	const xml = wxr(item({ extra: meta('_wp_old_slug', 'already-%e2%80%93-encoded') })
		+ item({ id: 3, status: 'draft', html: `<img src="/wp-content/uploads/${image}">` })
		+ attachment());
	const { inventory, manifest } = await createInventory({ xml, uploadsRoot, baseline });
	assert.equal(inventory.assets.length, 0);
	assert.ok(inventory.uploadFiles.every((entry) => !entry.included));
	assert.ok(inventory.uploadFiles.every((entry) => entry.reason === 'omit-excluded-content-only-proposed'));
	assert.ok(manifest.urls.some((entry) => entry.source === '/2020/01/02/already-%e2%80%93-encoded/'));
	assert.ok(!manifest.urls.some((entry) => entry.kind === 'query-id' && entry.source === '/?p=3'));
	assert.ok(!JSON.stringify(inventory.records.find((entry) => entry.id === 3)).includes('synthetic.png'));
});

test('comment identities are hashed in memory, private fields never persist, and bodies are only audited', async (t) => {
	const uploadsRoot = await fixture(t);
	const email = ['Synthetic.Identity', 'example.invalid'].join('@');
	const extra = comment({ email: `  ${email.toUpperCase()}  `, body: `Contact ${email}`,
		website: `https://example.invalid/?email=${email}` })
		+ comment({ id: 11, parent: 10 }) + comment({ id: 12, approved: 'spam', body: 'Excluded synthetic body' });
	const result = await createInventory({ xml: wxr(item({ html: `Contact ${email}`, extra })), uploadsRoot, baseline });
	const serialized = JSON.stringify(result);
	assert.ok(!serialized.includes(email));
	assert.ok(!serialized.includes('192.0.2.1'));
	assert.ok(!serialized.includes('Excluded synthetic body'));
	assert.equal(result.inventory.comments[0].gravatarHash, createHash('sha256').update(email.toLowerCase()).digest('hex'));
	assert.equal(result.inventory.comments[0].website, null);
	assert.equal(result.inventory.comments[1].parentId, 10);
	assert.equal(result.inventory.comments[2].reason, 'not-approved');
	assert.equal(result.inventory.privacyFindings.length, 3);
	assert.equal(result.inventory.counts.comments.included, 2);
});

test('missing comment parents, cycles, duplicate IDs and duplicate permalink paths are explicit blockers', async (t) => {
	const uploadsRoot = await fixture(t);
	const extra = comment({ id: 10, parent: 11 }) + comment({ id: 11, parent: 10 })
		+ comment({ id: 12, parent: 999 }) + comment({ id: 12 });
	const xml = wxr(item({ extra }) + item() + item({ id: 3 }));
	const { inventory } = await createInventory({ xml, uploadsRoot, baseline });
	const codes = inventory.issues.map((entry) => entry.code);
	for (const code of ['comment-parent-cycle', 'comment-parent-unavailable', 'duplicate-comment-id',
		'duplicate-wordpress-id', 'duplicate-legacy-path']) assert.ok(codes.includes(code));
});

test('comment websites must be absolute safe HTTP URLs, not relative paths or executable schemes', async (t) => {
	const uploadsRoot = await fixture(t);
	const extra = comment({ id: 10, website: 'https://example.invalid/profile' })
		+ comment({ id: 11, website: 'relative-profile' })
		+ comment({ id: 12, website: 'javascript:alert(1)' });
	const { inventory } = await createInventory({ xml: wxr(item({ extra })), uploadsRoot, baseline });
	assert.equal(inventory.comments[0].website, 'https://example.invalid/profile');
	assert.equal(inventory.comments[1].website, null);
	assert.equal(inventory.comments[2].website, null);
	assert.equal(inventory.issues.filter((entry) => entry.code === 'comment-website-review-required').length, 2);
});

test('missing images and unreadable metadata remain listed and block checks rather than disappearing', async (t) => {
	const uploadsRoot = await fixture(t);
	await writeFile(path.join(uploadsRoot, image), 'not an image');
	const xml = wxr(item({ html: `<img src="/wp-content/uploads/${image}"><img src="/wp-content/uploads/2020/01/missing.png">` }));
	const result = await createInventory({ xml, uploadsRoot, baseline });
	assert.equal(result.inventory.assets.length, 2);
	assert.ok(result.inventory.issues.some((entry) => entry.code === 'image-metadata-unreadable'));
	assert.ok(result.inventory.issues.some((entry) => entry.code === 'missing-original'));
	assert.ok(result.inventory.issues.some((entry) => entry.code === 'missing-referenced-file'));
	assert.ok(acceptanceFailures(result).includes('missing-original'));
});

test('code replacements, optimization cases, downloads, external images and unused files need dispositions', async (t) => {
	const uploadsRoot = await fixture(t);
	await writeFile(path.join(uploadsRoot, '2020/01/download.pdf'), 'synthetic PDF placeholder');
	await writeFile(path.join(uploadsRoot, '2020/01/video.mp4'), 'synthetic MP4 placeholder');
	await writeFile(path.join(uploadsRoot, '2020/01/unused.txt'), 'synthetic unused file');
	const html = `<img src="/wp-content/uploads/${image}"><img src="https://example.invalid/image.png">
		<a href="/wp-content/uploads/2020/01/download.pdf">Reference</a>
		[video mp4="${origin}/wp-content/uploads/2020/01/video.mp4"][/video]`;
	const result = await createInventory({
		xml: wxr(item({ html }) + attachment()), uploadsRoot,
		baseline: { ...baseline, codeImages: [image], optimization: [image] },
	});
	assert.equal(result.inventory.assets.length, 3);
	assert.equal(result.inventory.assets.find((entry) => entry.original === image).disposition, 'fenced-code-replacement');
	assert.ok(result.manifest.urls.some((entry) => entry.source.endsWith('download.pdf') && entry.destination === null));
	assert.equal(result.manifest.externalImages.length, 1);
	assert.ok(result.manifest.uploadDispositions.some((entry) => entry.path.endsWith('unused.txt')
		&& entry.reason === 'omit-unreferenced-proposed'));
});

test('unknown languages and unsupported shortcode candidates are reported without interpreting source code', async (t) => {
	const uploadsRoot = await fixture(t);
	const html = '<pre class="lang:c#">[CallerMemberName] void Code() {}</pre>'
		+ '<pre data-enlighter-language="xml">&lt;View /&gt;</pre><pre>unknown language</pre>[caption]caption[/caption][unsupported value="x"]';
	const { inventory } = await createInventory({ xml: wxr(item({ html })), uploadsRoot, baseline });
	assert.deepEqual(inventory.records[0].codeLanguages, ['c#', 'unknown', 'xml']);
	assert.deepEqual(inventory.records[0].shortcodes, ['caption', 'unsupported']);
});

test('symlinks are rejected and backup/plugin folders are not traversed', async (t) => {
	const uploadsRoot = await fixture(t);
	await mkdir(path.join(uploadsRoot, 'updraft'));
	await symlink('/nonexistent-synthetic-backup', path.join(uploadsRoot, 'updraft', 'backup'));
	const result = await createInventory({ xml: wxr(item()), uploadsRoot, baseline });
	assert.ok(!result.inventory.uploadFiles.some((entry) => entry.path.startsWith('updraft')));
	await symlink(path.join(uploadsRoot, image), path.join(uploadsRoot, '2020/01/symlink.png'));
	await assert.rejects(createInventory({ xml: wxr(item()), uploadsRoot, baseline }), /Symlinks/);
});

test('the report baseline parser independently recovers the agreed file lists', async () => {
	const report = await readFile(new URL('../MIGRATION-REPORT.md', import.meta.url), 'utf8');
	const parsed = reportBaseline(report);
	assert.equal(parsed.originals.length, 125);
	assert.equal(parsed.codeImages.length, 7);
	assert.equal(parsed.optimization.length, 20);
	assert.equal(parsed.unused.length, 74);
	assert.equal(parsed.mixed.length, 12);
	assert.equal(parsed.console.length, 8);
	assert.throws(() => reportBaseline('unrecognized report'), /sections are missing/);
});

test('CLI rejects unknown arguments with a nonzero, privacy-safe diagnostic', () => {
	const result = spawnSync(process.execPath, [new URL('./migration-inventory.mjs', import.meta.url).pathname, '--unknown'], {
		encoding: 'utf8',
	});
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Usage:/);
	assert.ok(!result.stderr.includes('at main'));
});
