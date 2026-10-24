// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import { SITE_ORIGIN } from './src/lib/urls.ts';

// https://astro.build/config
export default defineConfig({
	site: SITE_ORIGIN,
	output: 'static',
	trailingSlash: 'always',
	build: { format: 'directory' },
	server: { host: true, port: 4321 },
	redirects: {
		'/blog/': '/',
		'/404-error-content-does-not-exist-anymore/': '/404.html',
	},
	integrations: [mdx(), sitemap()],
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