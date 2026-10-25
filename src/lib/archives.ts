import type { CollectionEntry } from 'astro:content';
import compatibility from '../data/migration-compatibility.json' with { type: 'json' };

export type ArchivePost = Pick<CollectionEntry<'blog'>, 'id' | 'data'>;
export interface TaxonomyTerm {
	kind: 'category' | 'tag';
	slug: string;
	name: string;
}

export function sortedPosts<T extends ArchivePost>(posts: T[]): T[] {
	return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
		|| (b.data.legacy?.id ?? 0) - (a.data.legacy?.id ?? 0)
		|| a.id.localeCompare(b.id, 'en'));
}

export function taxonomyTerms(posts: ArchivePost[]): TaxonomyTerm[] {
	const terms: TaxonomyTerm[] = compatibility.taxonomies.map((term) => {
		if (term.kind !== 'category' && term.kind !== 'tag') throw new Error('Invalid taxonomy namespace.');
		return { ...term, kind: term.kind };
	});
	for (const post of posts) {
		for (const [kind, field] of [['category', 'categories'], ['tag', 'tags']] as const) {
			const slugs = post.data.legacy?.taxonomySlugs?.[field] ?? post.data[field];
			for (const slug of slugs) {
				if (terms.some((term) => term.kind === kind && term.slug === slug)) continue;
				if (post.data.legacy || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
					throw new Error(`Missing reviewed taxonomy mapping for post ${post.id}.`);
				}
				terms.push({ kind, slug, name: slug });
			}
		}
	}
	return terms;
}

export function postTerms(post: ArchivePost): TaxonomyTerm[] {
	return taxonomyTerms([post]).filter((term) => {
		const field = term.kind === 'category' ? 'categories' : 'tags';
		return (post.data.legacy?.taxonomySlugs?.[field] ?? post.data[field]).includes(term.slug);
	});
}

export function archivePath(base: string, page: number): string {
	if (!Number.isSafeInteger(page) || page < 1) throw new Error('Archive page must be a positive integer.');
	return page === 1 ? base : `${base}page/${page}/`;
}

export function archivePages<T extends ArchivePost>(input: T[], pageSize = compatibility.pageSize) {
	if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new Error('Archive page size must be a positive integer.');
	const posts = sortedPosts(input);
	const groups = [
		{ base: '/', title: undefined as string | undefined, posts },
		...taxonomyTerms(posts).map((term) => {
			const field = term.kind === 'category' ? 'categories' : 'tags';
			return {
				base: `/${term.kind}/${term.slug}/`,
				title: `${term.kind === 'category' ? 'Category' : 'Tag'}: ${term.name}`,
				posts: posts.filter((post) => (post.data.legacy?.taxonomySlugs?.[field] ?? post.data[field]).includes(term.slug)),
			};
		}),
	];
	return groups.flatMap((group) => {
		const firstPageSize = group.base === '/' ? pageSize + 1 : pageSize;
		const remainingPosts = Math.max(0, group.posts.length - firstPageSize);
		const total = Math.max(1, 1 + Math.ceil(remainingPosts / pageSize));
		return Array.from({ length: total }, (_, index) => ({
			base: group.base, title: group.title, page: index + 1, total,
			path: archivePath(group.base, index + 1),
			previous: index ? archivePath(group.base, index) : undefined,
			next: index + 1 < total ? archivePath(group.base, index + 2) : undefined,
			posts: index === 0
				? group.posts.slice(0, firstPageSize)
				: group.posts.slice(firstPageSize + (index - 1) * pageSize, firstPageSize + index * pageSize),
		}));
	});
}
