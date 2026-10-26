import assert from 'node:assert/strict';
import test from 'node:test';
import { CONSENT_KEY, MEASUREMENT_ID, initializeAnalytics } from '../src/lib/analytics.ts';

const origin = 'https://blog.pieeatingninjas.be';
const validChoice = (choice) => JSON.stringify({ choice, expiresAt: Date.now() + 86_400_000 });

function browser({
	production = true, url = `${origin}/2020/01/01/synthetic/`, stored,
	blocked = false, writesBlocked = false,
} = {}) {
	class Element extends EventTarget {
		hidden = true;
		attributes = {};
		setAttribute(name, value) { this.attributes[name] = value; }
		focus() { this.focused = true; }
		click() { this.dispatchEvent(new Event('click')); }
		remove() { this.removed = true; }
	}
	const elements = Object.fromEntries([
		'analytics-consent', 'analytics-settings', 'analytics-accept', 'analytics-refuse',
		'analytics-close', 'analytics-preview', 'analytics-storage-warning',
	].map((id) => [id, new Element()]));
	const win = new EventTarget();
	win.location = new URL(url);
	win.location.reload = () => { win.reloads = (win.reloads ?? 0) + 1; };
	const storage = new Map(stored === undefined ? [] : [[CONSENT_KEY, stored]]);
	win.localStorage = {
		getItem(key) {
			if (blocked) throw new Error('Storage blocked');
			return storage.get(key) ?? null;
		},
		setItem(key, value) {
			if (blocked || writesBlocked) throw new Error('Storage blocked');
			storage.set(key, value);
		},
		removeItem(key) {
			if (blocked || writesBlocked) throw new Error('Storage blocked');
			storage.delete(key);
		},
	};
	const scripts = [];
	const deletedCookies = [];
	const cookies = new Map([['_ga', 'synthetic'], [`_ga_${MEASUREMENT_ID.slice(2)}`, 'synthetic'], ['other', 'keep']]);
	const doc = {
		title: 'Synthetic article',
		getElementById: (id) => elements[id],
		createElement: () => new Element(),
		head: { append: (script) => scripts.push(script) },
		get cookie() { return [...cookies].map(([name, value]) => `${name}=${value}`).join('; '); },
		set cookie(value) {
			deletedCookies.push(value);
			cookies.delete(value.split('=')[0]);
		},
	};
	initializeAnalytics(production, win, doc);
	return {
		win, doc, elements, scripts, storage, cookies, deletedCookies,
		commands: () => (win.dataLayer ?? []).map((command) => Array.from(command)),
		updateStorage(value, key = CONSENT_KEY) {
			if (value === undefined) storage.delete(CONSENT_KEY);
			else storage.set(CONSENT_KEY, value);
			const event = new Event('storage');
			Object.assign(event, { key });
			win.dispatchEvent(event);
		},
	};
}

test('unknown consent loads nothing, offers both choices, and exposes settings', () => {
	const b = browser();
	assert.equal(b.scripts.length, 0);
	assert.deepEqual(b.commands(), []);
	assert.equal(b.elements['analytics-consent'].hidden, false);
	assert.equal(b.elements['analytics-settings'].hidden, false);
	assert.equal(b.elements['analytics-close'].hidden, true);
	assert.equal(b.win[`ga-disable-${MEASUREMENT_ID}`], true);
});

test('acceptance persists a bounded choice, loads once and sends one explicit page view', () => {
	const b = browser({ url: `${origin}/2020/01/01/synthetic/?private=redacted#private` });
	b.elements['analytics-accept'].click();
	b.elements['analytics-accept'].click();
	assert.equal(b.scripts.length, 1);
	assert.equal(b.scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`);
	assert.equal(b.scripts[0].async, true);
	assert.equal(b.scripts[0].referrerPolicy, 'no-referrer');
	const commands = b.commands();
	const views = commands.filter(([command, name]) => command === 'event' && name === 'page_view');
	assert.equal(views.length, 1);
	assert.deepEqual(views[0][2], {
		page_location: `${origin}/2020/01/01/synthetic/`,
		page_referrer: '',
		page_title: 'Synthetic article',
	});
	const config = commands.find(([command]) => command === 'config')[2];
	assert.equal(config.send_page_view, false);
	assert.equal(config.allow_google_signals, false);
	assert.equal(config.allow_ad_personalization_signals, false);
	assert.equal(config.cookie_domain, 'none');
	assert.equal(config.cookie_update, false);
	assert.equal(config.cookie_expires, 180 * 86_400);
	assert.deepEqual(commands[0], ['consent', 'default', {
		analytics_storage: 'granted', ad_storage: 'denied',
		ad_user_data: 'denied', ad_personalization: 'denied',
	}]);
	assert.equal(JSON.stringify(commands).includes('private'), false);
	const choice = JSON.parse(b.storage.get(CONSENT_KEY));
	assert.equal(choice.choice, 'accepted');
	assert.ok(choice.expiresAt > Date.now());
	assert.ok(choice.expiresAt <= Date.now() + 180 * 86_400_000);
	assert.equal(b.elements['analytics-consent'].hidden, true);
});

test('refusal persists without Google requests and preserves unrelated cookies', () => {
	const b = browser();
	b.elements['analytics-refuse'].click();
	assert.equal(JSON.parse(b.storage.get(CONSENT_KEY)).choice, 'refused');
	assert.equal(b.scripts.length, 0);
	assert.deepEqual([...b.cookies], [['other', 'keep']]);
	assert.ok(b.deletedCookies.some((cookie) => cookie.includes('Domain=pieeatingninjas.be')));
	assert.equal(b.win.reloads, undefined);
});

test('stored acceptance starts automatically; stored refusal does not', () => {
	for (const choice of ['accepted', 'refused']) {
		const b = browser({ stored: validChoice(choice) });
		assert.equal(b.scripts.length, choice === 'accepted' ? 1 : 0);
		assert.equal(b.elements['analytics-consent'].hidden, true);
	}
});

test('settings can reopen, close and change a previous refusal', () => {
	const b = browser({ stored: validChoice('refused') });
	b.elements['analytics-settings'].click();
	assert.equal(b.elements['analytics-consent'].hidden, false);
	assert.equal(b.elements['analytics-settings'].attributes['aria-expanded'], 'true');
	assert.equal(b.elements['analytics-accept'].focused, true);
	b.elements['analytics-close'].click();
	assert.equal(b.elements['analytics-consent'].hidden, true);
	assert.equal(b.elements['analytics-settings'].focused, true);
	b.elements['analytics-settings'].click();
	b.elements['analytics-accept'].click();
	assert.equal(b.scripts.length, 1);
});

test('withdrawal immediately disables GA, empties queued events, removes script and reloads', () => {
	const b = browser({ stored: validChoice('accepted') });
	b.elements['analytics-settings'].click();
	b.elements['analytics-refuse'].click();
	assert.equal(b.win[`ga-disable-${MEASUREMENT_ID}`], true);
	assert.equal(b.scripts[0].removed, true);
	assert.deepEqual(b.commands(), []);
	assert.equal(b.win.reloads, 1);
	assert.equal(JSON.parse(b.storage.get(CONSENT_KEY)).choice, 'refused');
	assert.deepEqual([...b.cookies], [['other', 'keep']]);
});

test('development and nonproduction origins never load GA even with acceptance', () => {
	for (const options of [
		{ production: false },
		{ url: 'http://localhost:4321/' },
		{ url: 'https://pieeatingninjas.github.io/PieEatingNinjas-Blog/' },
		{ url: 'https://blog.pieeatingninjas.be.example.test/' },
		{ url: 'http://blog.pieeatingninjas.be/' },
	]) {
		const b = browser({ ...options, stored: validChoice('accepted') });
		b.elements['analytics-accept'].click();
		assert.equal(b.scripts.length, 0);
		assert.deepEqual(b.commands(), []);
		assert.equal(b.elements['analytics-preview'].hidden, false);
		assert.equal(b.deletedCookies.length, 0);
	}
});

test('malformed, expired, unexpected or implausibly long consent fails closed', () => {
	for (const stored of [
		'broken', 'null', 'true', '{}', JSON.stringify({ choice: 'yes', expiresAt: Date.now() + 100_000 }),
		JSON.stringify({ choice: 'accepted', expiresAt: Date.now() - 1 }),
		JSON.stringify({ choice: 'accepted', expiresAt: 'forever' }),
		JSON.stringify({ choice: 'accepted', expiresAt: Date.now() + 181 * 86_400_000 }),
	]) {
		const b = browser({ stored });
		assert.equal(b.scripts.length, 0);
		assert.equal(b.elements['analytics-consent'].hidden, false);
	}
});

test('blocked storage fails closed but still allows a current-page choice', () => {
	const b = browser({ blocked: true });
	assert.equal(b.scripts.length, 0);
	b.elements['analytics-accept'].click();
	assert.equal(b.scripts.length, 1);
	b.elements['analytics-refuse'].click();
	assert.equal(b.win[`ga-disable-${MEASUREMENT_ID}`], true);
	assert.equal(b.win.reloads, undefined);
	assert.equal(b.elements['analytics-storage-warning'].hidden, false);
});

test('failed withdrawal persistence never reloads into a readable stale acceptance', () => {
	const b = browser({ stored: validChoice('accepted'), writesBlocked: true });
	assert.equal(b.scripts.length, 1);
	b.elements['analytics-refuse'].click();
	assert.equal(b.win[`ga-disable-${MEASUREMENT_ID}`], true);
	assert.equal(b.scripts[0].removed, true);
	assert.deepEqual(b.commands(), []);
	assert.equal(b.win.reloads, undefined);
	assert.equal(b.elements['analytics-storage-warning'].hidden, false);
	assert.equal(JSON.parse(b.storage.get(CONSENT_KEY)).choice, 'accepted');
});

test('cross-tab withdrawal, acceptance, expiry and clearing storage are observed', () => {
	const b = browser();
	b.updateStorage(validChoice('accepted'));
	assert.equal(b.scripts.length, 1);
	b.updateStorage(validChoice('refused'));
	assert.equal(b.win[`ga-disable-${MEASUREMENT_ID}`], true);
	assert.equal(b.win.reloads, 1);
	for (const [stored, key] of [[undefined, null], ['invalid', CONSENT_KEY]]) {
		const other = browser({ stored: validChoice('accepted') });
		other.updateStorage(stored, key);
		assert.equal(other.win[`ga-disable-${MEASUREMENT_ID}`], true);
		assert.equal(other.elements['analytics-consent'].hidden, false);
	}
	const ignored = browser();
	ignored.updateStorage(validChoice('accepted'), 'unrelated-key');
	assert.equal(ignored.scripts.length, 0);
});
