import assert from 'node:assert/strict';
import test from 'node:test';
import { markdownToHtml } from 'satteri';
import { externalLinks } from '../src/lib/external-links.ts';

test('external Markdown links open safely in a new tab', () => {
	const { html } = markdownToHtml(
		'[external](https://example.com/path) and [protocol-relative](//another.example/path)',
		{ hastPlugins: [externalLinks] },
	);

	assert.match(html, /href="https:\/\/example\.com\/path"[^>]*target="_blank"/);
	assert.match(html, /href="https:\/\/example\.com\/path"[^>]*rel="noopener noreferrer"/);
	assert.match(html, /href="\/\/another\.example\/path"[^>]*target="_blank"/);
});

test('same-site and non-web links keep their normal navigation behavior', () => {
	const { html } = markdownToHtml(
		'[same-site](https://blog.pieeatingninjas.be/about/) [relative](/about/) [email](mailto:hello@example.com)',
		{ hastPlugins: [externalLinks] },
	);

	assert.doesNotMatch(html, /href="https:\/\/blog\.pieeatingninjas\.be\/about\/"[^>]*target=/);
	assert.doesNotMatch(html, /href="\/about\/"[^>]*target=/);
	assert.doesNotMatch(html, /href="mailto:hello@example\.com"[^>]*target=/);
});
