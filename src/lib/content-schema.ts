import { z } from 'astro/zod';
import { parsePostPath } from './urls.ts';

export const postFields = {
	title: z.string().min(1),
	description: z.string().min(1),
	pubDate: z.coerce.date(),
	updatedDate: z.coerce.date().optional(),
	categories: z.array(z.string().min(1)).default([]),
	tags: z.array(z.string().min(1)).default([]),
	legacy: z.object({
		id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
		path: z.string().refine((value) => {
			try {
				parsePostPath(value);
				return true;
			} catch {
				return false;
			}
		}, 'Expected an exact dated legacy permalink with a valid date and slug.'),
	}).strict().optional(),
};

export function matchesLegacyDate(data: {
	pubDate: Date;
	legacy?: { path: string };
}): boolean {
	if (!data.legacy) return true;
	try {
		return data.pubDate.toISOString().slice(0, 10) === parsePostPath(data.legacy.path).date;
	} catch {
		return false;
	}
}

export const pagePaths = {
	about: '/about/',
	book: '/book/',
	privacy: '/privacy-policy/',
	'not-found': '/404.html',
} as const;

export const legacyPageSchema = z.object({
	role: z.enum(['about', 'book', 'privacy', 'not-found']),
	legacyId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
	path: z.string(),
	title: z.string().min(1),
	description: z.string().min(1),
}).strict().refine((page) => page.path === pagePaths[page.role], 'Page path must match its selected role.');
