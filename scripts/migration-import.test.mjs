import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';
import { PDFDocument, PDFName } from 'pdf-lib';
import { assertPrivateSafe, codeReplacements, convertMarkup, fence, importPilot, importPosts, importTaxonomy, reviewedCodeRepositories, safeLink, sanitizeDocument, sanitizePostBody, transformImage } from './migration-import.mjs';

const report = await readFile(new URL('../IMAGE-CODE-EXTRACTION-REPORT.md', import.meta.url), 'utf8');
const replacements = codeReplacements(report);
const image = async (url) => {
	const original = new URL(url, 'https://blog.pieeatingninjas.be').pathname
		.replace('/wp-content/uploads/', '').replace(/-\d+x\d+(?=\.)/, '');
	return { original, url: `/wp-content/uploads/${original}` };
};
const convert = (html, extra = {}) => convertMarkup(html, { image, replacements, postPath: '/2020/01/01/sample/', ...extra });

test('review report provides exactly seven transcriptions; annotated images are not replacements', () => {
	assert.equal(replacements.size, 7);
	for (const file of ['2015/11/vs-warning.jpg', '2015/12/xaml-inside.jpg', '2015/12/xaml-out.jpg', '2017/05/Binding-Resources.png']) {
		assert.equal(replacements.has(file), false);
	}
	assert.throws(() => codeReplacements(''), /seven/);
});

test('preserves WordPress blank-line paragraphs and mixed inline formatting', async () => {
	const result = await convert('First paragraph.\n\nSecond <em>emphasized</em> paragraph.\n\n<h2>Heading</h2>\nLast paragraph.');
	assert.equal(result.markdown, 'First paragraph.\n\nSecond _emphasized_ paragraph.\n\n## Heading\n\nLast paragraph.\n');
});

test('standalone linked and unlinked screenshots remain separate paragraphs', async () => {
	const result = await convert('Introduction.\nOne picture says more than a thousand words:\n<a href="/wp-content/uploads/2017/11/sample.jpg"><img src="/wp-content/uploads/2017/11/sample.jpg" alt="Sample"></a>\n\nFollowing paragraph.\n\n<img src="/wp-content/uploads/2020/02/table.jpg" alt="Address file structure">\n\nExplanation.');
	assert.equal(result.markdown, 'Introduction. One picture says more than a thousand words:\n\n[![Sample](/wp-content/uploads/2017/11/sample.jpg)](/wp-content/uploads/2017/11/sample.jpg)\n\nFollowing paragraph.\n\n![Address file structure](/wp-content/uploads/2020/02/table.jpg)\n\nExplanation.\n');
});

test('inline code avoids artificial padding but protects literal backticks', async () => {
	const result = await convert('<p>Use <code>TextView</code> and <code>`value`</code>.</p>');
	assert.equal(result.markdown, 'Use `TextView` and `` `value` ``.\n');
});

test('eID content reference targets the content specification, not the applet reference manual', async () => {
	const manual = '/wp-content/uploads/2020/02/Public_Belpic_Applet_v1-7_Ref_Manual-A01.pdf';
	const result = await convert(`<p><a href="${manual}">Belgian eID content document</a> and <a href="${manual}">Applet reference manual</a></p>`, {
		allowPostMedia: true, postPath: '/2020/02/15/reading-belgian-eid-in-uwp-using-smartcardreader/',
	});
	assert.match(result.markdown, /\[Belgian eID content document\]\(\/wp-content\/uploads\/2020\/02\/belgian_electronic_identity_card_content_v2\.8\.a\.pdf\)/);
	assert.match(result.markdown, /\[Applet reference manual\]\(\/wp-content\/uploads\/2020\/02\/Public_Belpic_Applet_v1-7_Ref_Manual-A01\.pdf\)/);
	assert.match(result.markdown, /Documentation source:.*\[official Belgian eID middleware repository\]\(https:\/\/github\.com\/Fedict\/eid-mw\)/);
});

test('local PDFs retain pages deterministically without document identity metadata', async () => {
	const document = await PDFDocument.create();
	document.addPage();
	document.setAuthor('Synthetic private author');
	document.setCreator('Synthetic creator');
	const input = Buffer.from(await document.save());
	const first = await sanitizeDocument(input);
	assert.deepEqual(await sanitizeDocument(input), first);
	const parsed = await PDFDocument.load(first.output, { updateMetadata: false });
	assert.equal(parsed.getPageCount(), 1);
	assert.equal(parsed.getAuthor(), undefined);
	assert.equal(parsed.getCreator(), undefined);
	assert.equal(parsed.catalog.has(PDFName.of('Metadata')), false);
	assert.ok(!first.output.includes(Buffer.from('Synthetic')));
	await assert.rejects(sanitizeDocument(Buffer.from('Not a PDF')), /Expected a PDF/);
	await assert.rejects(sanitizeDocument(Buffer.from('%PDF-broken')), /PDF decoding failed/);
});

test('converts reviewed code images at their location and keeps annotated originals and captions', async () => {
	const result = await convert('[caption width="300"]<a href="/wp-content/uploads/2015/12/code-inside1.jpg"><img src="/wp-content/uploads/2015/12/code-inside1-1024x128.jpg" alt="Code"></a> Code behind[/caption]\n\n<img src="/wp-content/uploads/2015/12/xaml-inside-300x129.jpg" alt="Annotated XAML">');
	assert.match(result.markdown, /```csharp\nprivate void ScrollViewer_PointerInside/);
	assert.match(result.markdown, /Code behind/);
	assert.match(result.markdown, /!\[Annotated XAML\]\(\/wp-content\/uploads\/2015\/12\/xaml-inside.jpg\)/);
	assert.doesNotMatch(result.markdown, /!\[Code\]|caption width|1024x128/);
	assert.equal(result.metrics.imageCode, 1);
	assert.equal(result.imageMappings[0].to, '/2020/01/01/sample/#legacy-code-code-inside1');
});

test('tagged legacy/Gutenberg/Enlighter code preserves generic types, indexers, attributes and whitespace', async () => {
	const code = '[CallerMemberName]\nvar value = values[0];\nIObservable<Result> stream;\n    // ``` remains code\n';
	const escaped = code.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
	for (const attributes of ['class="lang:c# decode:true"', 'data-enlighter-language="csharp"']) {
		const result = await convert(`<!-- wp:code --><pre ${attributes}>${escaped}</pre><!-- /wp:code -->`);
		assert.ok(result.markdown.includes(`\`\`\`\`csharp\n${code}\`\`\`\``));
		assert.equal(result.metrics.sourceCode, 1);
	}
	const result = await convert('<pre class="wp-block-code"><code class="language-xml">&lt;Grid /&gt;</code></pre>');
	assert.match(result.markdown, /```xml\n<Grid \/>/);
	const titled = await convert('<pre class="lang:c#" title="&lt;script&gt; [label](javascript:bad)">value[index];</pre>');
	assert.doesNotMatch(titled.markdown, /<script>|\[label\]\(javascript/);
	assert.match(titled.markdown, /&lt;script&gt;/);
	assert.throws(() => fence('unknown', 'not-reviewed'), /Unknown code language/);
});

test('the reviewed styled C# fragment retains text and explicit indentation; changed markup fails', async () => {
	const result = await convert('<p style="margin-bottom:0;">private void Example()\n</p><p style="margin-bottom:0;">{</p><p style="padding-left:30px;margin-bottom:0;">Call();</p>}\n\nMind you this is synthetic.', { styledSnippet: true });
	assert.match(result.markdown, /```csharp\nprivate void Example\(\)\n\{\n {4}Call\(\);\n}\n```/);
	assert.equal(result.metrics.sourceCode, 1);
	await assert.rejects(convert('<p>Changed snippet.</p>', { styledSnippet: true }), /snippet changed/);
});

test('converts synthetic .NET/MAUI/Azure prose, tables, lists, links and Gutenberg wrappers', async () => {
	const result = await convert('<!-- wp:paragraph --><p>Azure and .NET MAUI <strong>sample</strong>.</p><!-- /wp:paragraph --><ul><li>One</li><li>Two</li></ul><table><thead><tr><th>API</th></tr></thead><tbody><tr><td>.NET</td></tr></tbody></table><a href="http://blog.pieeatingninjas.be/2020/01/01/sample/">Local</a>');
	assert.match(result.markdown, /Azure and \.NET MAUI \*\*sample\*\*/);
	assert.match(result.markdown, /- +One/);
	assert.match(result.markdown, /\| API \|/);
	assert.match(result.markdown, /\[Local\]\(\/2020\/01\/01\/sample\/\)/);
	assert.doesNotMatch(result.markdown, /wp:|wp-block/);
});

test('unknown markup, executable content, unsafe links, shortcodes and unknown languages fail explicitly', async () => {
	for (const html of ['<script>alert(1)</script>', '<img src="/x.jpg" onerror="alert(1)">',
		'<iframe src="https://example.invalid"></iframe>', '<a href="javascript:alert(1)">Bad</a>',
		'[gallery ids="1,2"]', '[unsupported]', '<pre>unknown language</pre>', '<custom-widget>text</custom-widget>',
		'[video src="movie.mp4"][/video]']) {
		await assert.rejects(convert(html));
	}
	const ads = await convert('<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script><ins class="adsbygoogle"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script><p>Keep me.</p>');
	assert.equal(ads.markdown, 'Keep me.\n');
	assert.equal(ads.metrics.removedAds, 3);
});

test('privacy policy checks text, HTML attributes and encoded identities without logging values', () => {
	const synthetic = 'person@example.invalid';
	for (const value of [synthetic, `<a href="mailto:${synthetic}">Contact</a>`,
		'<img alt="person&#64;example.invalid">', 'https://example.invalid/person%40example.invalid']) {
		assert.throws(() => assertPrivateSafe(value, 'synthetic fixture'), (error) => {
			assert.doesNotMatch(error.message, /person@|example\.invalid/);
			return /Privacy/.test(error.message);
		});
	}
	assert.doesNotThrow(() => assertPrivateSafe('var percent = value % 2; @class.PropertyChanged', 'code'));
	for (const value of ['data:text/html,bad', '//example.invalid/?token=secret', 'https://user:password@example.invalid']) {
		assert.throws(() => safeLink(value));
	}
});

test('srcset references are validated before removal, and art-directed sources fail', async () => {
	const calls = [];
	await convert('<img src="/wp-content/uploads/2020/01/example.jpg" srcset="/wp-content/uploads/2020/01/example-300x200.jpg 300w">', {
		image: async (url) => { calls.push(url); return image(url); },
	});
	assert.equal(calls.length, 2);
	await assert.rejects(convert('<img src="/wp-content/uploads/2020/01/example.jpg" srcset="/wp-content/uploads/2020/01/different.jpg 300w">'), /Art-directed/);
});

test('only explicitly reviewed sample repositories become metadata; body links remain unchanged', async () => {
	const urls = ['https://github.com/example/sample-one', 'https://github.com/example/sample-two'];
	const html = `<p>Example code: <a href="${urls[0]}">First</a>, <a href="${urls[1]}">Second</a>.</p>
		<p>Library: <a href="https://github.com/example/library">Dependency</a>.</p>`;
	assert.deepEqual(reviewedCodeRepositories(html, urls), urls);
	assert.deepEqual(reviewedCodeRepositories(html, []), []);
	assert.throws(() => reviewedCodeRepositories(html, ['https://github.com/example/missing']), /missing/);
	assert.throws(() => reviewedCodeRepositories(html, [urls[0], urls[0]]), /Duplicate/);
	assert.throws(() => reviewedCodeRepositories(html, ['https://github.com/example/sample-one/issues']), /Invalid/);
	const converted = await convert(html);
	for (const url of [...urls, 'https://github.com/example/library']) assert.ok(converted.markdown.includes(url));
});

test('C# category/tag names are preserved separately from legacy c slugs, without renaming the C language', () => {
	const terms = [
		{ '#text': 'C#', '@_domain': 'category', '@_nicename': 'c' },
		{ '#text': 'C', '@_domain': 'category', '@_nicename': 'c-language' },
		{ '#text': 'C#', '@_domain': 'post_tag', '@_nicename': 'c' },
		{ '#text': 'XAML', '@_domain': 'category', '@_nicename': 'xaml' },
	];
	assert.deepEqual(importTaxonomy(terms, 'category'), { values: ['C#', 'c-language', 'xaml'], slugs: ['c', 'c-language', 'xaml'] });
	assert.deepEqual(importTaxonomy(terms, 'post_tag'), { values: ['C#'], slugs: ['c'] });
	assert.deepEqual(importTaxonomy([], 'category'), { values: [], slugs: [] });
	assert.throws(() => importTaxonomy([{ '#text': 'C#', '@_domain': 'category' }], 'category'), /Missing/);
});

test('reviewed generic/Gutenberg resolutions, inline code and code-related link labels are preserved', async () => {
	const result = await convert('<pre class="EnlighterJSRAW" data-enlighter-language="generic">&lt;Grid /&gt;</pre><pre class="wp-block-code"> \n </pre><span class="crayon-inline">values[index]</span><a href="https://github.com/example/sample">code on GitHub</a>', {
		languageResolutions: { 0: 'xml', 1: 'empty' },
	});
	assert.equal(result.metrics.sourceCode, 1);
	assert.equal(result.metrics.emptyCode, 1);
	assert.match(result.markdown, /```xml\n<Grid \/>/);
	assert.match(result.markdown, /`values\[index\]`/);
	assert.match(result.markdown, /\[code on GitHub\]/);
	await assert.rejects(convert('<pre>Not empty</pre>', { languageResolutions: { 0: 'empty' } }), /no longer empty/);
	assert.deepEqual(reviewedCodeRepositories('<a href="https://github.com/example/sample/tree/feature">Code</a>',
		['https://github.com/example/sample']), ['https://github.com/example/sample']);
});

test('video shortcodes become local static players; the approved external screenshot uses a local image', async () => {
	const result = await convert('[video width="800" height="600" mp4="/wp-content/uploads/2017/12/demo.mp4"][/video]<img src="https://pbs.twimg.com/media/GMggKuTWIAA-nhj?format=jpg&amp;name=medium" alt="Screenshot">', { allowPostMedia: true });
	assert.equal(result.metrics.videos, 1);
	assert.equal(result.metrics.externalImagesLocalized, 1);
	assert.match(result.markdown, /<video controls preload="metadata" src="\/wp-content\/uploads\/2017\/12\/demo.mp4">/);
	assert.match(result.markdown, /!\[Screenshot\]\(\/wp-content\/uploads\/2024\/05\/xamarin-archived.jpg\)/);
	assert.doesNotMatch(result.markdown, /pbs\.twimg\.com|View the archived-repository screenshot/);
	await assert.rejects(convert('<img src="https://pbs.twimg.com/media/GMggKuTWIAA-nhj?format=jpg&amp;name=medium">', {
		allowPostMedia: true, image: async () => { throw new Error('Referenced original is missing'); },
	}), /Referenced original is missing/);
	await assert.rejects(convert('[video mp4="/wp-content/uploads/2017/12/demo.mp4" autoplay="true"][/video]',
		{ allowPostMedia: true }), /Unsupported video/);
});

test('only the explicitly reviewed illustrative identities are removed, preserving mailto code', async () => {
	const input = '<p>Address: person@example.invalid; action: mailto:person@example.invalid.</p><pre class="lang:c#">Linkify("mailto:");</pre>';
	const sanitized = sanitizePostBody(input, 1247);
	assert.equal(sanitized.privacyRedactions, 2);
	assert.doesNotMatch(sanitized.html, /person@example/);
	assert.match(sanitized.html, /Linkify\("mailto:"\)/);
	await convert(sanitized.html);
	await assert.rejects(convert(sanitizePostBody(input, 900000).html), /Privacy/);
	assert.throws(() => sanitizePostBody('No address', 1247), /Expected two/);
});

test('still-image optimization enforces measured width and byte budgets and strips metadata', async () => {
	const input = await sharp({ create: { width: 2080, height: 1200, channels: 3, background: '#dddddd' } })
		.withMetadata().jpeg().toBuffer();
	const result = await transformImage(input, '2023/12/cover_image-scaled.jpg');
	assert.equal(result.measurements.width, 800);
	assert.equal(result.measurements.inputWidth, 2080);
	assert.ok(result.output.length <= 500_000);
	const metadata = await sharp(result.output).metadata();
	assert.equal(metadata.exif, undefined);
	assert.equal(metadata.icc, undefined);
});

test('GIF conversion preserves both frames, animation loop and frame timing', async () => {
	const raw = Buffer.concat([Buffer.alloc(4 * 4 * 3, 30), Buffer.alloc(4 * 4 * 3, 220)]);
	const input = await sharp(raw, { raw: { width: 4, height: 8, channels: 3, pageHeight: 4 } })
		.gif({ loop: 0, delay: [100, 200] }).toBuffer();
	const converted = await transformImage(input, '2020/01/synthetic.gif');
	assert.equal(converted.outputName, '2020/01/synthetic.webp');
	assert.equal(converted.measurements.frames, 2);
	assert.equal(converted.measurements.durationMs, 300);
	const metadata = await sharp(converted.output).metadata();
	assert.equal(metadata.loop, 0);
	assert.deepEqual(metadata.delay, [100, 200]);
});

test('maximum finite GIF loop counts retain GIF rather than changing playback in WebP', async () => {
	const raw = Buffer.concat([Buffer.alloc(4 * 4 * 3, 30), Buffer.alloc(4 * 4 * 3, 220)]);
	const gif = await sharp(raw, { raw: { width: 4, height: 8, channels: 3, pageHeight: 4 } })
		.gif({ loop: 65535, delay: [100, 200] }).toBuffer();
	const marker = gif.indexOf(Buffer.from('NETSCAPE2.0'));
	assert.ok(marker >= 0);
	gif.writeUInt16LE(65535, marker + 13);
	assert.equal((await sharp(gif).metadata()).loop, 65536);
	const result = await transformImage(gif, '2020/01/finite.gif');
	assert.equal(result.outputName, '2020/01/finite.gif');
	const metadata = await sharp(result.output).metadata();
	assert.equal(metadata.loop, 65536);
	assert.deepEqual(metadata.delay, [100, 200]);
	assert.equal(result.measurements.frames, 2);
});

test('public OneDrive share URLs are narrowly supported without accepting authentication parameters on other hosts', () => {
	assert.doesNotThrow(() => safeLink('https://onedrive.live.com/redir?resid=ABCDEF!123&authkey=!synthetic_public_share&ithint=folder%2Czip'));
	for (const url of [
		'https://example.invalid/redir?resid=ABCDEF!123&authkey=!synthetic_public_share',
		'https://onedrive.live.com/other?resid=ABCDEF!123&authkey=!synthetic_public_share',
		'https://onedrive.live.com/redir?resid=ABCDEF!123&authkey=!synthetic_public_share&token=secret',
	]) assert.throws(() => safeLink(url), /Unsafe/);
});

async function fixture(t) {
	const root = await mkdtemp(path.join(os.tmpdir(), 'astro-pilot-test-'));
	t.after(() => rm(root, { recursive: true, force: true }));
	const sourceRoot = path.join(root, '_migration');
	await mkdir(path.join(sourceRoot, 'blog/wp-content/uploads/2020/01'), { recursive: true });
	await mkdir(path.join(root, 'src/content/blog'), { recursive: true });
	await writeFile(path.join(root, 'IMAGE-CODE-EXTRACTION-REPORT.md'), report);
	await writeFile(path.join(root, 'src/content/blog/manual.md'), 'Manually maintained.\n');
	const paths = [
		'/2015/11/05/starting-a-blog-since-2011/', '/2015/11/07/deferred-loading-mind-the-visual-state-manager/',
		'/2015/11/14/using-rx-in-a-uwp-project-with-mvvm/', '/2015/11/15/xbind-and-inheritance/',
		'/2015/12/30/disable-gestures-on-pivot-control/',
	];
	const repositoryLinks = {
		2: '<a href="https://github.com/PieEatingNinjas/TestRxUniversal">Example code</a>',
		4: '<a href="https://github.com/PieEatingNinjas/PivotWithoutSwipe">Example code</a>',
	};
	const items = paths.map((url, index) => `<item><title>Synthetic ${index}</title><link>https://blog.pieeatingninjas.be${url}</link><wp:post_id>${1000 + index}</wp:post_id><wp:post_type>post</wp:post_type><wp:status>publish</wp:status><category domain="category" nicename="dotnet">.NET</category><category domain="post_tag" nicename="sample">Sample</category><content:encoded><![CDATA[<p>Synthetic content.</p>${repositoryLinks[index] ?? ''}${index === 0 ? '<img src="https://i0.wp.com/blog.pieeatingninjas.be/wp-content/uploads/2020/01/example-300x200.jpg?w=300" alt="Synthetic">' : ''}]]></content:encoded></item>`).join('');
	const xml = `<rss xmlns:wp="http://wordpress.org/export/1.2/" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><wp:wxr_version>1.2</wp:wxr_version>${items}<item><wp:post_id>9999</wp:post_id><wp:post_type>post</wp:post_type><wp:status>draft</wp:status><content:encoded>Never publish.</content:encoded></item></channel></rss>`;
	await writeFile(path.join(sourceRoot, 'export.xml'), xml);
	const imagePath = path.join(sourceRoot, 'blog/wp-content/uploads/2020/01/example.jpg');
	await sharp({ create: { width: 600, height: 400, channels: 3, background: '#eeeeee' } }).jpeg().toFile(imagePath);
	await sharp(imagePath).resize(300).toFile(imagePath.replace('.jpg', '-300x200.jpg'));
	return { root, sourceRoot };
}

test('two full pilot runs are byte-identical, keep manual content and do not copy variants or drafts', async (t) => {
	const options = await fixture(t);
	const first = await importPilot(options);
	const statePath = path.join(options.root, '_migration/pilot/state.json');
	const state = await readFile(statePath, 'utf8');
	const second = await importPilot(options);
	assert.deepEqual(first, second);
	assert.equal(await readFile(statePath, 'utf8'), state);
	assert.equal(await readFile(path.join(options.root, 'src/content/blog/manual.md'), 'utf8'), 'Manually maintained.\n');
	assert.equal(first.posts.length, 5);
	assert.equal(first.assets.length, 1);
	assert.equal(first.assets[0].inputBytes, first.assets[0].outputBytes);
	assert.deepEqual(await readdir(path.join(options.root, 'public/wp-content/uploads/2020/01')), ['example.jpg']);
	assert.equal((await readFile(path.join(options.root, first.posts[0].file), 'utf8')).includes('i0.wp.com'), false);
	assert.doesNotMatch(await readFile(path.join(options.root, first.posts[0].file), 'utf8'), /codeRepositories:/);
	assert.match(await readFile(path.join(options.root, first.posts[2].file), 'utf8'),
		/codeRepositories: \["https:\/\/github.com\/PieEatingNinjas\/TestRxUniversal"\]/);
});

test('collision preflight does not overwrite manual files or any other output', async (t) => {
	const options = await fixture(t);
	const imported = await importPilot(options);
	const changed = path.join(options.root, imported.posts[0].file);
	await writeFile(changed, 'Owner edits.\n');
	const unaffected = await readFile(path.join(options.root, imported.posts[1].file));
	await assert.rejects(importPilot(options), /manually modified/);
	assert.equal(await readFile(changed, 'utf8'), 'Owner edits.\n');
	assert.deepEqual(await readFile(path.join(options.root, imported.posts[1].file)), unaffected);
});

test('missing assets, changed pilot selection, and symlink outputs fail before writes', async (t) => {
	const options = await fixture(t);
	const xmlPath = path.join(options.sourceRoot, 'export.xml');
	const xml = await readFile(xmlPath, 'utf8');
	await writeFile(xmlPath, xml.replace('starting-a-blog-since-2011', 'different'));
	await assert.rejects(importPilot(options), /Pilot selection changed/);
	await writeFile(xmlPath, xml.replace('example-300x200.jpg', 'missing.jpg'));
	await assert.rejects(importPilot(options), /missing/);
	await writeFile(xmlPath, xml);
	await symlink(path.join(options.root, 'src'), path.join(options.root, 'public'));
	await assert.rejects(importPilot(options), /Symlink/);
	await rm(path.join(options.root, 'public'));
	await symlink(path.join(options.root, 'missing-target'), path.join(options.root, 'public'));
	await assert.rejects(importPilot(options), /Symlink/);
});

test('full post import includes exactly 62 public posts, excludes pages/drafts and preserves manual content', async (t) => {
	const options = await fixture(t);
	const xmlPath = path.join(options.sourceRoot, 'export.xml');
	const xml = await readFile(xmlPath, 'utf8');
	const more = Array.from({ length: 57 }, (_, index) => `<item><title>Additional synthetic post ${index}</title><link>https://blog.pieeatingninjas.be/2020/01/01/synthetic-${String(index).padStart(2, '0')}/</link><wp:post_id>${900000 + index}</wp:post_id><wp:post_type>post</wp:post_type><wp:status>publish</wp:status><category domain="category" nicename="c">C#</category><content:encoded><![CDATA[<p>Synthetic post.</p>]]></content:encoded></item>`).join('');
	const page = '<item><title>Excluded page</title><wp:post_type>page</wp:post_type><wp:status>publish</wp:status></item>';
	const pdf = await PDFDocument.create();
	pdf.addPage();
	pdf.setAuthor('Synthetic author');
	const pdfSource = path.join(options.sourceRoot, 'blog/wp-content/uploads/2020/02');
	await mkdir(pdfSource, { recursive: true });
	const pdfName = 'belgian_electronic_identity_card_content_v2.8.a.pdf';
	await writeFile(path.join(pdfSource, pdfName), await pdf.save());
	const fullXml = xml.replace('</channel>', `${more}${page}</channel>`);
	await writeFile(xmlPath, fullXml);
	await importPilot(options);
	await writeFile(xmlPath, fullXml.replace('<p>Synthetic post.</p>',
		`<p>Synthetic post. <a href="/wp-content/uploads/2020/02/${pdfName}">Local PDF</a></p>`));
	const first = await importPosts({ ...options, all: true });
	assert.equal(first.posts.length, 62);
	assert.equal(first.scope, 'all-published-posts');
	const document = first.assets.find((asset) => asset.kind === 'document');
	assert.equal(document.pages, 1);
	assert.equal(document.path, `/wp-content/uploads/2020/02/${pdfName}`);
	assert.equal((await PDFDocument.load(await readFile(path.join(options.root, `public${document.path}`)), { updateMetadata: false })).getAuthor(), undefined);
	const statePath = path.join(options.root, '_migration/pilot/state.json');
	const before = await readFile(statePath, 'utf8');
	await importPosts({ ...options, all: true });
	assert.equal(await readFile(statePath, 'utf8'), before);
	const cache = path.join(options.root, '_migration/post-media-cache');
	const binary = (await readdir(cache)).find((file) => file.endsWith('.bin'));
	await writeFile(path.join(cache, binary), 'Modified transformed media');
	await assert.rejects(importPosts({ ...options, all: true }), /cache is incomplete or modified/);
	assert.equal(await readFile(path.join(options.root, 'src/content/blog/manual.md'), 'utf8'), 'Manually maintained.\n');
	const generated = await readFile(path.join(options.root, first.posts.at(-1).file), 'utf8');
	assert.match(generated, /categories: \["C#"\]/);
	assert.match(generated, /"taxonomySlugs":\{"categories":\["c"\],"tags":\[\]\}/);
	await assert.rejects(importPilot(options), /Owned output set changed/);
	await writeFile(xmlPath, xml);
	await assert.rejects(importPosts({ ...options, all: true }), /62 published posts/);
});
