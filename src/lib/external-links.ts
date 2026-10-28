import { defineHastPlugin } from 'satteri';
import { SITE_ORIGIN } from './urls.ts';

const siteOrigin = new URL(SITE_ORIGIN).origin;

export const externalLinkAttributes = {
	target: '_blank',
	rel: 'noopener noreferrer',
} as const;

export const externalLinks = defineHastPlugin({
	name: 'external-links',
	element: {
		filter: ['a'],
		visit(node, context) {
			const href = node.properties.href;
			if (typeof href !== 'string' || !/^(?:https?:)?\/\//i.test(href)) return;

			const url = new URL(href, SITE_ORIGIN);
			if (url.origin === siteOrigin) return;

			const relTokens = node.properties.rel ?? [];
			context.setProperty(node, 'target', '_blank');
			context.setProperty(node, 'rel', [...new Set([...relTokens, 'noopener', 'noreferrer'])]);
		},
	},
});
