import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { GISCUS_PUBLIC_CONFIG, getGiscusConfig } from '../src/lib/giscus.ts';

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
		repo: 'PieEatingNinjas/PieEatingNinjas-Blog',
		repoId: 'R_kgDOVVzhhA',
		category: 'Announcements',
		categoryId: 'DIC_kwDOVVzhhM4DJuSL',
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

test('post comments are enabled by default and can be opted out per post', async () => {
	const schema = await readFile(new URL('../src/lib/content-schema.ts', import.meta.url), 'utf8');
	const layout = await readFile(new URL('../src/layouts/BlogPost.astro', import.meta.url), 'utf8');

	assert.match(schema, /allowComments:\s*z\.boolean\(\)\.default\(true\)/);
	assert.match(layout, /\{allowComments && <Giscus \/>\}/);
	assert.doesNotMatch(layout, /\{Astro\.props\.legacy && <Giscus \/>\}/);
});

test('Giscus loads its custom theme from the viewing origin in production and local development', async () => {
	const source = await readFile(new URL('../src/components/Giscus.astro', import.meta.url), 'utf8');
	for (const origin of [
		'https://blog.pieeatingninjas.be',
		'http://localhost:4321',
	]) {
		const [, theme] = /data-theme="([^"]+)"/.exec(source);
		const [, code] = /<script\b[^>]*>([\s\S]*?)<\/script>/.exec(source);
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
		assert.equal(embed.dataset.theme, `${origin}/giscus-theme.css`);
		assert.equal(embed['data-repo'], validConfig.repo);
		assert.equal(embed.src, 'https://giscus.app/client.js');
		assert.equal(embed.async, true);
		assert.equal(embed.crossOrigin, 'anonymous');
	}
});
