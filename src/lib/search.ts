export function normalizeSearchText(value: string): string {
	return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function searchTerms(query: string): string[] {
	return normalizeSearchText(query).trim().split(/\s+/u).filter(Boolean);
}

export function matchesSearch(text: string, terms: string[]): boolean {
	return terms.every((term) => text.includes(term));
}

export function initializePostSearch(doc: Document = document): void {
	const search = doc.querySelector<HTMLElement>('#post-search');
	if (!search) return;

	const form = search.querySelector('form');
	const input = search.querySelector<HTMLInputElement>('input');
	const clear = search.querySelector<HTMLButtonElement>('button[type="reset"]');
	const results = search.querySelector<HTMLElement>('#post-search-results');
	const status = search.querySelector<HTMLElement>('[role="status"]');
	const archive = doc.querySelector<HTMLElement>('#home-posts');
	if (!form || !input || !clear || !results || !status || !archive) {
		throw new Error('Post search markup is incomplete.');
	}
	const entries = Array.from(search.querySelectorAll<HTMLElement>('[data-search-text]')).map((element) => {
		const text = element.dataset.searchText;
		if (text === undefined) throw new Error('Post search entry is missing its search text.');
		return { element, text };
	});

	const update = () => {
		const terms = searchTerms(input.value);
		const active = terms.length > 0;
		let count = 0;
		for (const entry of entries) {
			const matches = active && matchesSearch(entry.text, terms);
			entry.element.hidden = !matches;
			if (matches) count++;
		}
		archive.hidden = active;
		results.hidden = !active;
		clear.disabled = !input.value;
		status.textContent = !active ? '' : count === 0
			? 'No posts found. Try different search terms.'
			: `${count} ${count === 1 ? 'post' : 'posts'} found.`;
	};

	const reset = () => {
		input.value = '';
		update();
		input.focus();
	};

	form.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			event.preventDefault();
			reset();
		}
	});
	form.addEventListener('submit', (event) => event.preventDefault());
	input.addEventListener('input', update);
	form.addEventListener('reset', (event) => {
		event.preventDefault();
		reset();
	});
	update();
	search.hidden = false;
}
