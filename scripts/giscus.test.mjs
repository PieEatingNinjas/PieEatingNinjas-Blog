import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { GISCUS_PUBLIC_CONFIG, getGiscusConfig } from '../src/lib/giscus.ts';
import { rewriteHtml } from './pages-base-path.mjs';

const validConfig = {
	repo: 'PieEatingNinjas/PieEatingNinjas-blog-discussions',
	repoId: 'R_kgDOExample',
	category: 'Blog comments',
	categoryId: 'DIC_kwDOExample',
};

test('Giscus can be disabled with an explicit false flag', () => {
	assert.equal(getGiscusConfig('false'), undefined);
});

test('complete configuration is returned only when explicitly enabled', () => {
	assert.deepEqual(getGiscusConfig('true', validConfig), validConfig);
	assert.deepEqual(GISCUS_PUBLIC_CONFIG, {
		repo: 'PieEatingNinjas/PieEatingNinjas-blog-discussions',
		repoId: 'R_kgDOVWsG1Q',
		category: 'Announcements',
		categoryId: 'DIC_kwDOVWsG1c4DJkl6',
	});
});

test('enabled Giscus rejects incomplete configuration', () => {
	const { categoryId, ...incomplete } = validConfig;
	assert.throws(() => getGiscusConfig('true', incomplete), /configuration is incomplete: categoryId/);
});

test('invalid enable flags and repository names fail explicitly', () => {
	assert.throws(() => getGiscusConfig('yes', validConfig), /must be either/);
	assert.throws(() => getGiscusConfig('true', { ...validConfig, repo: 'not-a-repository' }), /owner\/repository/);
});

test('Giscus loads its custom theme from the viewing origin on root and Pages deployments', async () => {
	const source = await readFile(new URL('../src/components/Giscus.astro', import.meta.url), 'utf8');
	for (const [origin, base] of [
		['https://blog.pieeatingninjas.be', ''],
		['https://pieeatingninjas.github.io', '/PieEatingNinjas-Blog'],
		['http://localhost:4321', ''],
	]) {
		const html = base ? rewriteHtml(source, base) : source;
		const [, theme] = /data-theme="([^"]+)"/.exec(html);
		const [, code] = /<script\b[^>]*>([\s\S]*?)<\/script>/.exec(html);
		const embed = { dataset: {}, setAttribute(name, value) { this[name] = value; } };
		let appended;
		runInNewContext(code, {
			URL,
			window: { location: { origin } },
			document: {
				currentScript: {
					attributes: [{ name: 'data-repo', value: validConfig.repo }, { name: 'data-theme', value: theme }],
					dataset: { theme },
					after(script) { appended = script; },
				},
				createElement(tag) {
					assert.equal(tag, 'script');
					return embed;
				},
			},
		});
		assert.equal(appended, embed);
		assert.equal(embed.dataset.theme, `${origin}${base}/giscus-theme.css`);
		assert.equal(embed['data-repo'], validConfig.repo);
		assert.equal(embed.src, 'https://giscus.app/client.js');
		assert.equal(embed.async, true);
		assert.equal(embed.crossOrigin, 'anonymous');
	}
});
