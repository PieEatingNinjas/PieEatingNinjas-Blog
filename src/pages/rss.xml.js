import { getPosts } from '../lib/posts';
import { postUrl } from '../lib/urls';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { sortedPosts } from '../lib/archives';

export async function GET(context) {
	const posts = sortedPosts(await getPosts());
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: postUrl(post),
		})),
	});
}
