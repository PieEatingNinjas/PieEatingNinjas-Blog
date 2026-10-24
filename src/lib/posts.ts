import { getCollection } from 'astro:content';
import { legacyPages } from './legacy-pages';
import { assertUniqueRoutes, postUrl } from './urls';

export async function getPosts() {
	const posts = await getCollection('blog');
	assertUniqueRoutes([
		...posts.map((post) => ({ path: postUrl(post), legacyId: post.data.legacy?.id })),
		...Object.values(legacyPages),
	]);
	return posts;
}
