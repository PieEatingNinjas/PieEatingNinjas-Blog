import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { matchesLegacyDate, postFields } from './lib/content-schema';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			...postFields,
			heroImage: z.optional(z.union([
				z.string().regex(/^\/wp-content\/uploads\/\d{4}\/\d{2}\/[^/]+\.(?:jpe?g|png|gif|webp)$/i),
				image(),
			])),
		}).refine(matchesLegacyDate, 'Publication date must match the date in the legacy permalink.'),
});

export const collections = { blog };
