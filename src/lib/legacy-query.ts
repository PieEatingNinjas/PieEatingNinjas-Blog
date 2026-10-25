export interface QueryIdMap {
	p: Record<string, string>;
	page_id: Record<string, string>;
}

export function resolveLegacyQuery(search: string, fragment: string, ids: QueryIdMap): string | undefined {
	const params = new URLSearchParams(search);
	const entries = [...params.entries()].filter(([key]) => key === 'p' || key === 'page_id');
	if (entries.length !== 1) return undefined;
	const [key, id] = entries[0];
	if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return undefined;
	const map = key === 'p' ? ids.p : ids.page_id;
	if (!Object.hasOwn(map, id)) return undefined;
	const destination = map[id];
	if (!/^\/(?!\/)[^?#\\\s]*$/.test(destination)) return undefined;
	const url = new URL(destination, 'https://blog.pieeatingninjas.be');
	if (url.pathname !== destination) return undefined;
	return `${destination}${fragment.startsWith('#') ? fragment : ''}`;
}
