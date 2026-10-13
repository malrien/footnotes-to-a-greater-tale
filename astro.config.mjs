// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
	// GitHub Pages serves the site at https://malrien.github.io/footnotes-to-a-greater-tale/
	// (`base` is the repository's name). With a custom domain, change `base` to '/'.
	site: 'https://malrien.github.io',
	base: '/footnotes-to-a-greater-tale',
	integrations: [mdx()],
	// Lets the cover preload /contents while the opening animation plays.
	prefetch: true,
	// Fonts are downloaded at build time and served by the site itself (preloaded
	// in BookLayout), instead of fetched from Google by each visitor. Astro also
	// builds size-matched fallbacks, so a late font doesn't shift the text.
	fonts: [
		{
			provider: fontProviders.google(),
			name: 'Cinzel Decorative',
			cssVariable: '--font-cinzel-decorative',
			weights: [400, 700],
			styles: ['normal'],
			fallbacks: ['serif'],
			// Titles and the drop cap: never show them in a stand-in font first
			// (the big initial visibly resized when the real font swapped in).
			display: 'block',
		},
		{
			provider: fontProviders.google(),
			name: 'IM Fell English',
			cssVariable: '--font-fell',
			weights: [400],
			styles: ['normal', 'italic'],
			fallbacks: ['Georgia', 'serif'],
		},
		{
			provider: fontProviders.google(),
			name: 'IM Fell English SC',
			cssVariable: '--font-fell-sc',
			weights: [400],
			styles: ['normal'],
			fallbacks: ['Georgia', 'serif'],
		},
		{
			provider: fontProviders.google(),
			name: 'Homemade Apple',
			cssVariable: '--font-hand',
			weights: [400],
			styles: ['normal'],
			fallbacks: ['cursive'],
		},
		{
			provider: fontProviders.google(),
			name: 'Pinyon Script',
			cssVariable: '--font-signature',
			weights: [400],
			styles: ['normal'],
			fallbacks: ['cursive'],
		},
	],
});
