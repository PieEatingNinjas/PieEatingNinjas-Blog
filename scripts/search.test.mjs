import assert from 'node:assert/strict';
import test from 'node:test';
import { initializePostSearch, matchesSearch, normalizeSearchText, searchTerms } from '../src/lib/search.ts';

function browser(query = '') {
	class Element extends EventTarget {
		hidden = false;
		disabled = false;
		value = '';
		textContent = '';
		dataset = {};
		focus() { this.focused = true; }
	}
	const search = new Element();
	search.hidden = true;
	const form = new Element();
	const input = new Element();
	input.value = query;
	const clear = new Element();
	const results = new Element();
	const status = new Element();
	const archive = new Element();
	const entries = [
		'C# and .NET MAUI UI patterns Mobile development',
		'An older Azure article Serverless functions Cloud',
		'Café notes JavaScript Web',
	].map((text) => {
		const entry = new Element();
		entry.dataset.searchText = normalizeSearchText(text);
		return entry;
	});
	const selectors = {
		form, input, 'button[type="reset"]': clear,
		'#post-search-results': results, '[role="status"]': status,
	};
	search.querySelector = (selector) => selectors[selector] ?? null;
	search.querySelectorAll = () => entries;
	const doc = { querySelector: (selector) => ({
		'#post-search': search, '#home-posts': archive,
	})[selector] ?? null };
	initializePostSearch(doc);
	return {
		search, form, input, clear, results, status, archive, entries,
		type(value) { input.value = value; input.dispatchEvent(new Event('input')); },
	};
}

test('search normalizes case, accents and whitespace while preserving technical punctuation', () => {
	assert.equal(normalizeSearchText('CAFÉ C# .NET C++'), 'cafe c# .net c++');
	assert.deepEqual(searchTerms(' \t .NET \n MAUI  '), ['.net', 'maui']);
	assert.deepEqual(searchTerms(' \n '), []);
	assert.equal(matchesSearch('c# .net maui', searchTerms('MAUI C#')), true);
	assert.equal(matchesSearch('c# .net maui', searchTerms('MAUI Azure')), false);
	assert.equal(matchesSearch('c++ .net', searchTerms('C#')), false);
	assert.equal(matchesSearch('cafe notes', searchTerms('café')), true);
	assert.equal(matchesSearch('literal [query]', searchTerms('[query]')), true);
});

test('empty search enables controls without changing the original cards or pagination', () => {
	const b = browser();
	assert.equal(b.search.hidden, false);
	assert.equal(b.archive.hidden, false);
	assert.equal(b.results.hidden, true);
	assert.equal(b.clear.disabled, true);
	assert.equal(b.status.textContent, '');
	assert.equal(b.input.focused, undefined);
});

test('Escape clears search and restores the archive while keeping the field available', () => {
	const b = browser();
	b.type('azure');
	const escape = new Event('keydown', { cancelable: true });
	Object.assign(escape, { key: 'Escape' });
	b.form.dispatchEvent(escape);
	assert.equal(escape.defaultPrevented, true);
	assert.equal(b.input.value, '');
	assert.equal(b.search.hidden, false);
	assert.equal(b.archive.hidden, false);
	assert.equal(b.input.focused, true);
});

test('input searches all indexed posts and requires all terms in any order', () => {
	const b = browser();
	b.type('FUNCTIONS azure');
	assert.deepEqual(b.entries.map((entry) => entry.hidden), [true, false, true]);
	assert.equal(b.archive.hidden, true);
	assert.equal(b.results.hidden, false);
	assert.equal(b.status.textContent, '1 post found.');
	assert.equal(b.clear.disabled, false);
	b.type('development');
	assert.deepEqual(b.entries.map((entry) => entry.hidden), [false, true, true]);
	b.type('C#');
	assert.deepEqual(b.entries.map((entry) => entry.hidden), [false, true, true]);
	b.type('a');
	assert.equal(b.status.textContent, '3 posts found.');
});

test('no matches reports an explicit empty state and never interprets the query as markup', () => {
	const b = browser();
	b.type('<img src=x onerror=alert(1)>');
	assert.ok(b.entries.every((entry) => entry.hidden));
	assert.equal(b.status.textContent, 'No posts found. Try different search terms.');
	assert.equal(b.archive.hidden, true);
	b.type('cafe');
	assert.equal(b.entries[2].hidden, false);
});

test('clearing and whitespace restore the archive; reset restores keyboard focus', () => {
	const b = browser();
	b.type('azure');
	const reset = new Event('reset', { cancelable: true });
	b.form.dispatchEvent(reset);
	assert.equal(reset.defaultPrevented, true);
	assert.equal(b.input.value, '');
	assert.equal(b.input.focused, true);
	assert.equal(b.archive.hidden, false);
	assert.equal(b.results.hidden, true);
	assert.equal(b.clear.disabled, true);
	b.type('   ');
	assert.equal(b.archive.hidden, false);
	assert.equal(b.results.hidden, true);
	b.type('');
	assert.equal(b.clear.disabled, true);
});

test('initial restored input is applied and form submission never navigates', () => {
	const b = browser('azure');
	assert.equal(b.archive.hidden, true);
	assert.equal(b.entries[1].hidden, false);
	assert.equal(b.search.hidden, false);
	assert.equal(b.input.focused, undefined);
	const submit = new Event('submit', { cancelable: true });
	b.form.dispatchEvent(submit);
	assert.equal(submit.defaultPrevented, true);
});

test('other pages do nothing, but incomplete search markup fails explicitly', () => {
	assert.doesNotThrow(() => initializePostSearch({ querySelector: () => null }));
	assert.throws(() => initializePostSearch({
		querySelector: () => ({ querySelector: () => null }),
	}), /markup is incomplete/);
});
