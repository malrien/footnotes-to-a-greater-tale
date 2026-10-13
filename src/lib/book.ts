import { getCollection, type CollectionKey } from 'astro:content';

/** Prefixes internal paths with the site `base` (needed on GitHub Pages). */
export function url(path = '/'): string {
	if (/^(https?:|data:|#)/.test(path)) return path;
	const base = import.meta.env.BASE_URL.replace(/\/$/, '');
	return `${base}/${path.replace(/^\//, '')}`;
}

/** Drafts show up only in `npm run dev`, never on the published site. */
export async function published<C extends CollectionKey>(collection: C) {
	return getCollection(collection, ({ data }) => import.meta.env.DEV || !('draft' in data && data.draft));
}

export async function sortedChapters() {
	return (await published('chapters')).sort((a, b) => a.data.number - b.data.number);
}

const NUMERALS: [number, string][] = [
	[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
	[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

/**
 * The first letter of a text's first paragraph, read from its raw MDX body.
 * The drop-cap CSS needs it (as data-initial) to make room for the capitals
 * whose flourish dips below the baseline. Worked out at build time so the page
 * is right from the first paint (setting it with JS made the letter jump).
 */
export function initialOf(body = ''): string | undefined {
	const blocks = body
		.replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // MDX comments
		.split(/\n\s*\n/)
		.map((b) => b.trim())
		.filter(Boolean);
	// First block of plain prose: not a component, heading, rule or import/export
	const prose = blocks.find((b) => !/^(<|#|---|\{|import\s|export\s|>)/.test(b));
	return prose?.match(/\p{L}/u)?.[0]?.toUpperCase();
}

/** "Prologue" for chapter 0, "Chapter IV" otherwise. */
export function chapterLabel(n: number): string {
	return n === 0 ? 'Prologue' : `Chapter ${roman(n)}`;
}

export function roman(n: number): string {
	let s = '';
	for (const [v, r] of NUMERALS) while (n >= v) { s += r; n -= v; }
	return s;
}
