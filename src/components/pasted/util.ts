import { url } from '../../lib/book';

export type Position = 'left' | 'right' | 'center';

/** A "random" but stable tilt: the same object always lands the same way. */
export function tiltFrom(seed: string, max = 3): number {
	let h = 0;
	for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
	return Math.round(((Math.abs(h) % 1000) / 1000) * max * 20 - max * 10) / 10;
}

export function styleVars(tilt: number, width?: string | number): string {
	const w = typeof width === 'number' ? `${width}%` : width;
	return `--tilt:${tilt}deg;${w ? `--width:${w};` : ''}`;
}

/** Accepts "/images/x.png" (the public folder) or a full URL. */
export function assetUrl(src: string): string {
	return src.startsWith('/') ? url(src) : src;
}
