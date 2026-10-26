// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import { SITE_ORIGIN } from './src/lib/urls.ts';
import compatibility from './src/data/legacy-site.json' with { type: 'json' };

// https://astro.build/config
export default defineConfig({
	site: SITE_ORIGIN,
	output: 'static',
	trailingSlash: 'always',
	build: { format: 'directory' },
	server: { host: true, port: 4321 },
	security: {
		allowedDomains: [{ protocol: 'https', hostname: 'giscus.app' }],
	},
	vite: {
		server: {
			cors: { origin: 'https://giscus.app' },
		},
	},
	redirects: compatibility.redirects,
	integrations: [mdx(), sitemap({
		filter: (url) => !Object.hasOwn(compatibility.redirects, new URL(url).pathname)
			&& !['/404.html', '/feed/index.html', '/feed/'].includes(new URL(url).pathname),
	})],
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Atkinson',
			cssVariable: '--font-atkinson',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/atkinson-regular.woff'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/atkinson-bold.woff'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});