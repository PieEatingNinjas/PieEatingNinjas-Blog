import { SITE_ORIGIN } from './urls.ts';

export const MEASUREMENT_ID = 'G-5QRG2T1GBZ';
export const CONSENT_KEY = 'blog-analytics-consent-v1';
const CONSENT_LIFETIME = 180 * 24 * 60 * 60 * 1000;

type Choice = 'accepted' | 'refused';
type AnalyticsWindow = Window & {
	dataLayer?: unknown[];
	gtag?: (...args: unknown[]) => void;
	[key: `ga-disable-${string}`]: boolean;
};

export function initializeAnalytics(production: boolean, win: Window = window, doc: Document = document) {
	const panel = doc.getElementById('analytics-consent');
	const settings = doc.getElementById('analytics-settings');
	const accept = doc.getElementById('analytics-accept');
	const refuse = doc.getElementById('analytics-refuse');
	const close = doc.getElementById('analytics-close');
	if (!panel || !settings || !accept || !refuse || !close) return;

	const analytics = win as AnalyticsWindow;
	const enabled = production && win.location.origin === SITE_ORIGIN;
	const disableKey = `ga-disable-${MEASUREMENT_ID}` as const;
	let started = false;
	let script: HTMLScriptElement | undefined;

	function readChoice(): Choice | undefined {
		try {
			const stored = JSON.parse(win.localStorage.getItem(CONSENT_KEY) ?? 'null');
			if (
				(stored?.choice === 'accepted' || stored?.choice === 'refused')
				&& Number.isFinite(stored.expiresAt) && stored.expiresAt > Date.now()
				&& stored.expiresAt <= Date.now() + CONSENT_LIFETIME
			) return stored.choice;
		} catch {
			// Storage may be unavailable; no stored choice means no analytics.
		}
		return undefined;
	}

	function clearCookies() {
		if (!enabled) return;
		const parts = win.location.hostname.split('.');
		const domains = ['', ...parts.slice(0, -1).map((_, index) => parts.slice(index).join('.'))];
		for (const cookie of doc.cookie.split(';')) {
			const name = cookie.split('=')[0].trim();
			if (!/^_ga(?:_|$)/.test(name)) continue;
			for (const domain of domains) {
				doc.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ''}`;
			}
		}
	}

	function start() {
		if (!enabled || started) return;
		started = true;
		analytics[disableKey] = false;
		analytics.dataLayer = analytics.dataLayer ?? [];
		analytics.gtag = function (..._args: unknown[]) {
			analytics.dataLayer!.push(arguments);
		};
		analytics.gtag('consent', 'default', {
			analytics_storage: 'granted',
			ad_storage: 'denied',
			ad_user_data: 'denied',
			ad_personalization: 'denied',
		});
		analytics.gtag('js', new Date());
		// Never pass query strings, fragments or the potentially private referrer.
		const pageLocation = `${SITE_ORIGIN}${win.location.pathname}`;
		analytics.gtag('config', MEASUREMENT_ID, {
			send_page_view: false,
			allow_google_signals: false,
			allow_ad_personalization_signals: false,
			cookie_domain: 'none',
			cookie_expires: CONSENT_LIFETIME / 1000,
			cookie_update: false,
			cookie_flags: 'SameSite=Lax;Secure',
			page_location: pageLocation,
			page_referrer: '',
			page_title: doc.title,
		});
		analytics.gtag('event', 'page_view', {
			page_location: pageLocation,
			page_referrer: '',
			page_title: doc.title,
		});
		script = doc.createElement('script');
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
		doc.head.append(script);
	}

	function stop() {
		analytics[disableKey] = true;
		script?.remove();
		if (analytics.dataLayer) analytics.dataLayer.length = 0;
		clearCookies();
		// Unload Google's listeners/timers as well as disabling collection immediately.
		if (started) win.location.reload();
	}

	let choice = readChoice();
	settings.hidden = false;
	const preview = doc.getElementById('analytics-preview');
	if (preview) preview.hidden = enabled;
	panel.hidden = choice !== undefined;
	settings.setAttribute('aria-expanded', String(!panel.hidden));
	close.hidden = choice === undefined;
	if (choice === 'accepted') start();
	else stop();

	function choose(next: Choice) {
		choice = next;
		try {
			win.localStorage.setItem(CONSENT_KEY, JSON.stringify({
				choice, expiresAt: Date.now() + CONSENT_LIFETIME,
			}));
		} catch {
			// The choice still applies to this page when storage is blocked.
		}
		panel!.hidden = true;
		close!.hidden = false;
		settings!.setAttribute('aria-expanded', 'false');
		settings!.focus();
		if (choice === 'accepted') start();
		else stop();
	}

	accept.addEventListener('click', () => choose('accepted'));
	refuse.addEventListener('click', () => choose('refused'));
	settings.addEventListener('click', () => {
		panel.hidden = false;
		settings.setAttribute('aria-expanded', 'true');
		accept.focus();
	});
	function closePanel() {
		panel!.hidden = true;
		settings!.setAttribute('aria-expanded', 'false');
		settings!.focus();
	}
	close.addEventListener('click', closePanel);
	panel.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && choice) closePanel();
	});
	win.addEventListener('storage', (event) => {
		if (event.key !== CONSENT_KEY && event.key !== null) return;
		choice = readChoice();
		panel.hidden = choice !== undefined;
		close.hidden = choice === undefined;
		settings.setAttribute('aria-expanded', String(!panel.hidden));
		if (choice === 'accepted') start();
		else stop();
	});
}
