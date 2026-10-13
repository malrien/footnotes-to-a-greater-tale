import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const mdx = (folder: string) => glob({ pattern: '**/*.{md,mdx}', base: `./src/content/${folder}` });

const chapters = defineCollection({
	loader: mdx('chapters'),
	schema: z.object({
		title: z.string(),
		// 0 = Prologue
		number: z.number().int().nonnegative(),
		world_date: z.string().optional(),
		location: z.string().optional(),
		summary: z.string().optional(),
		draft: z.boolean().default(false),
	}),
});

const notes = defineCollection({
	loader: mdx('notes'),
	schema: z.object({
		title: z.string(),
		kind: z.enum(['letter', 'diary', 'fragment']).default('diary'),
		world_date: z.string().optional(),
		from: z.string().optional(),
		to: z.string().optional(),
		seal: z.string().max(2).optional(),
		order: z.number().default(0),
		draft: z.boolean().default(false),
	}),
});

const characters = defineCollection({
	loader: mdx('characters'),
	schema: z.object({
		name: z.string(),
		epithet: z.string().optional(),
		relation: z.string().optional(),
		portrait: z.string().optional(),
		// photo = pasted in with tape; sketch = drawn on the page itself
		portrait_style: z.enum(['photo', 'sketch']).default('photo'),
		// for sketches: the paper it was drawn on (tinted = parchment, needs a stronger filter)
		portrait_paper: z.enum(['white', 'tinted']).default('white'),
		order: z.number().default(99),
		draft: z.boolean().default(false),
	}),
});

const glossary = defineCollection({
	loader: mdx('glossary'),
	schema: z.object({
		term: z.string(),
		kind: z.enum(['place', 'term', 'faction', 'object', 'creature']).default('term'),
		draft: z.boolean().default(false),
	}),
});

const profile = defineCollection({
	loader: mdx('profile'),
	schema: z.object({
		name: z.string(),
		title: z.string().optional(),
		portrait: z.string().optional(),
		// photo = pasted in with album corners; sketch = drawn on the page itself
		portrait_style: z.enum(['photo', 'sketch']).default('photo'),
		// for sketches: the paper it was drawn on (tinted = parchment, needs a stronger filter)
		portrait_paper: z.enum(['white', 'tinted']).default('white'),
		portrait_caption: z.string().optional(),
		// Free-form fields: shown on the profile in the order written.
		fields: z.record(z.string(), z.string()).default({}),
	}),
});

export const collections = { chapters, notes, characters, glossary, profile };
