export type LegacyComment = {
	id: number;
	parentId: number;
	name: string;
	website: string | null;
	gravatarHash: string | null;
	date: string;
	content: string;
};

export type CommentThreadEntry = {
	comment: LegacyComment;
	depth: number;
	parentId: number;
	orphaned: boolean;
	cycleRoot: boolean;
};

export function buildCommentTree(comments: LegacyComment[]) {
	const ordered = comments.toSorted((a, b) => a.date.localeCompare(b.date, 'en') || a.id - b.id);
	const byId = new Map<number, LegacyComment>();
	for (const comment of ordered) {
		if (byId.has(comment.id)) throw new Error('Duplicate comment ID in a post archive.');
		byId.set(comment.id, comment);
	}

	const parentById = new Map<number, number>(ordered.map((comment) => [comment.id,
		comment.parentId && byId.has(comment.parentId) ? comment.parentId : 0]));
	const orphanedCommentIds = ordered.filter((comment) => comment.parentId && !byId.has(comment.parentId))
		.map((comment) => comment.id);
	const cycleRoots = new Set<number>();
	const cycles: number[][] = [];
	const completed = new Set<number>();
	for (const comment of ordered) {
		if (completed.has(comment.id)) continue;
		const chain: number[] = [];
		const indexById = new Map<number, number>();
		let currentId = comment.id;
		while (currentId && !completed.has(currentId)) {
			const cycleStart = indexById.get(currentId);
			if (cycleStart !== undefined) {
				const cycleIds = chain.slice(cycleStart);
				const rootId = Math.min(...cycleIds);
				parentById.set(rootId, 0);
				cycleRoots.add(rootId);
				cycles.push(cycleIds.toSorted((a, b) => a - b));
				break;
			}
			indexById.set(currentId, chain.length);
			chain.push(currentId);
			currentId = parentById.get(currentId) ?? 0;
		}
		for (const id of chain) completed.add(id);
	}

	const children = new Map<number, LegacyComment[]>();
	for (const comment of ordered) {
		const parentId = parentById.get(comment.id) ?? 0;
		const siblings = children.get(parentId) ?? [];
		siblings.push(comment);
		children.set(parentId, siblings);
	}
	const entries: CommentThreadEntry[] = [];
	const visited = new Set<number>();
	const append = (comment: LegacyComment, depth: number) => {
		if (visited.has(comment.id)) throw new Error('Comment thread could not be reconciled.');
		visited.add(comment.id);
		entries.push({
			comment,
			depth,
			parentId: parentById.get(comment.id) ?? 0,
			orphaned: orphanedCommentIds.includes(comment.id),
			cycleRoot: cycleRoots.has(comment.id),
		});
		for (const child of children.get(comment.id) ?? []) append(child, depth + 1);
	};
	for (const root of children.get(0) ?? []) append(root, 0);
	if (visited.size !== ordered.length) throw new Error('Comment thread could not be reconciled.');
	return { entries, orphanedCommentIds, cycles };
}
