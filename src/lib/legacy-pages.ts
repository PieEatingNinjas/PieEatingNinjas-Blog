import { legacyPageSchema } from './content-schema.ts';

export const legacyPages = {
	about: legacyPageSchema.parse({
		role: 'about', legacyId: 5, path: '/about/',
		title: 'About Me', description: 'About the author of Pie Eating Ninjas.',
	}),
	book: legacyPageSchema.parse({
		role: 'book', legacyId: 1947, path: '/book/',
		title: 'Book', description: 'The MVVM Pattern in .NET MAUI.',
	}),
	privacy: legacyPageSchema.parse({
		role: 'privacy', legacyId: 1927, path: '/privacy-policy/',
		title: 'Privacy Policy', description: 'Privacy information for Pie Eating Ninjas.',
	}),
	notFound: legacyPageSchema.parse({
		role: 'not-found', legacyId: 1263, path: '/404.html',
		title: '404 - Page not found', description: 'The requested page could not be found.',
	}),
};
