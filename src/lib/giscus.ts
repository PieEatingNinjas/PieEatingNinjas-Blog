export type GiscusConfig = {
	repo: string;
	repoId: string;
	category: string;
	categoryId: string;
};

export const GISCUS_PUBLIC_CONFIG: GiscusConfig = {
	repo: 'PieEatingNinjas/PieEatingNinjas-Blog',
	repoId: 'R_kgDOVVzhhA',
	category: 'Announcements',
	categoryId: 'DIC_kwDOVVzhhM4DJuSL',
};

export function getGiscusConfig(enabled: string | undefined, config: Partial<GiscusConfig> = GISCUS_PUBLIC_CONFIG): GiscusConfig | undefined {
	if (enabled === undefined || enabled === 'false') return undefined;
	if (enabled !== 'true') {
		throw new Error('PUBLIC_GISCUS_ENABLED must be either "true" or "false".');
	}

	const normalized = {
		repo: config.repo?.trim() ?? '',
		repoId: config.repoId?.trim() ?? '',
		category: config.category?.trim() ?? '',
		categoryId: config.categoryId?.trim() ?? '',
	};
	const missing = Object.entries(normalized)
		.filter(([, value]) => value.length === 0)
		.map(([key]) => key);
	if (missing.length > 0) {
		throw new Error(`Giscus is enabled but configuration is incomplete: ${missing.join(', ')}.`);
	}
	if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(normalized.repo)) {
		throw new Error('PUBLIC_GISCUS_REPO must be a GitHub owner/repository name.');
	}

	return normalized;
}
