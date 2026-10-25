import assert from 'node:assert/strict';
import test from 'node:test';
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
