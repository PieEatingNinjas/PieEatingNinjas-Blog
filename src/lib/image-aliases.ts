import { readFile } from 'node:fs/promises';
import path from 'node:path';
import compatibility from '../data/migration-compatibility.json';

export function imageAliasPaths(extension: 'jpg' | 'png' | 'gif') {
	return compatibility.imageAliases.filter((alias) => alias.from.endsWith(`.${extension}`)).map((alias) => ({
		params: { asset: alias.from.slice('/wp-content/uploads/'.length, -(extension.length + 1)) },
		props: { target: alias.to },
	}));
}

export async function GET({ props }: { props: { target: string } }) {
	if (!/^\/wp-content\/uploads\/\d{4}\/\d{2}\/[^/\\]+$/.test(props.target)
		|| props.target.includes('..')) throw new Error('Invalid image alias target.');
	const bytes = await readFile(path.join(process.cwd(), 'public', props.target));
	const extension = props.target.split('.').pop();
	const type = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : `image/${extension}`;
	return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': type } });
}
