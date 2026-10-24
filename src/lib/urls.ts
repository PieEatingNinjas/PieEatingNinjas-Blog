export const SITE_ORIGIN = 'https://blog.pieeatingninjas.be';

export function parsePostPath(path: string) {
	const match = /^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\/$/.exec(path);
	if (!match) throw new Error(`Expected a dated post path with a trailing slash: ${path}`);
	const [, year, month, day, slug] = match;
	const date = `${year}-${month}-${day}`;
	const parsed = new Date(`${date}T00:00:00Z`);
	if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
		throw new Error(`Invalid calendar date in post path: ${path}`);
	}
	let decoded: string;
	try {
		decoded = decodeURIComponent(slug);
	} catch {
		throw new Error(`Invalid slug encoding in post path: ${path}`);
	}
	if (/[/?#\\\s\u0000-\u001f]/u.test(decoded) || ['.', '..'].includes(decoded)) {
		throw new Error(`Unsafe slug in post path: ${path}`);
	}
	return { year, month, day, slug, date };
}

export interface PostIdentity {
	id: string;
	data: { legacy?: { id: number; path: string } };
}

export function postUrl(post: PostIdentity): string {
	if (post.data.legacy) {
		parsePostPath(post.data.legacy.path);
		return post.data.legacy.path;
	}
	return `/blog/${post.id.split('/').map(encodeURIComponent).join('/')}/`;
}

export function canonicalUrl(path: string): string {
	if (!path.startsWith('/') || path.startsWith('//') || /[?#\\]/.test(path)) {
		throw new Error(`Expected a local canonical path: ${path}`);
	}
	return new URL(path, SITE_ORIGIN).href;
}

export function assertUniqueRoutes(entries: { path: string; legacyId?: number }[]): void {
	const paths = new Set<string>();
	const ids = new Set<number>();
	for (const entry of entries) {
		const key = decodeURIComponent(new URL(canonicalUrl(entry.path)).pathname).normalize('NFC');
		if (paths.has(key)) throw new Error(`Duplicate content path: ${entry.path}`);
		paths.add(key);
		if (entry.legacyId !== undefined) {
			if (!Number.isSafeInteger(entry.legacyId) || entry.legacyId <= 0) {
				throw new Error('Legacy IDs must be positive safe integers.');
			}
			if (ids.has(entry.legacyId)) throw new Error(`Duplicate WordPress ID: ${entry.legacyId}`);
			ids.add(entry.legacyId);
		}
	}
}
