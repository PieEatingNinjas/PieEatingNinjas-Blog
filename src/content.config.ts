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
			heroImage: z.optional(image()),
		}).refine(matchesLegacyDate, 'Publication date must match the date in the legacy permalink.'),
});

export const collections = { blog };
