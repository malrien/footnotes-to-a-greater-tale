## Project

Chronicle/diary of an FFXIV RP character, styled as an old book. Static Astro + MDX site, published on GitHub Pages (`base: '/footnotes-to-a-greater-tale'`, the repository's name; live at https://malrien.github.io/footnotes-to-a-greater-tale/).

**Language:** all site UI, content, code identifiers and docs are in **English** (the user writes and roleplays in English), even though the user chats in Portuguese.

**Voice:** everything in the book is written by Malrien himself: chapters, notes, profile, glossary, and even the small UI texts on book pages. Follow `docs/malrien-voice.md` (restrained Urianger-style English: archaic grammar with plain words, never addressing a reader, inventing nothing). Only the scratch page (a draft, never published) is out of character.

- Content: `src/content/<collection>/*.mdx`, schemas in `src/content.config.ts`. Drafts (`draft: true`) only show in dev (`published()` in `src/lib/book.ts`).
- Internal links and `public/` images always go through `url()` (`src/lib/book.ts`) because of `base`.
- "Pasted objects" (global MDX components): `src/components/pasted/`, registered in `pasted/index.ts`, styled in `src/styles/pasted.css`.
- Reading mode: the same DOM (`src/components/Book.astro`) serves scroll and book. Book mode uses CSS columns (`src/styles/book.css`) + `src/scripts/book-mode.ts` (pagination and page turns via clones of the book block). Mode lives in `html[data-reading]`, theme in `html[data-theme]`, both persisted in localStorage.
- Page turns (book-mode.ts): the leaf and underlay are added first in their starting pose, which looks identical to the page, and are `will-change: transform` so their GPU layers exist before the turn. The page underneath switches only after `afterPaint()`, and the leaf is removed only after the landed state is painted (`fill: 'forwards'`). Skipping any of these causes a one-frame blink. In book mode, every image in the chapter is loaded up front. The main cause of the old blink: a freshly cloned `<img>` has no size until it reloads, even from cache, so the clone laid out differently for 1–2 frames. `face()` therefore replaces every `<img>` in a clone with a `<canvas>` snapshot of the original, at the same size and with the same computed filter, opacity and margin (`snapshot()`, bitmaps cached in `bitmaps` and pre-drawn by `prepareBitmaps()` on each measure). A fresh `<img>` first lays out with no size, and even once loaded Chrome renders it again (costly for SVGs), so it shows up a frame late. Keep the canvases, or the images blink on click. Book-mode images are also `decoding="sync"` and decoded before each turn; otherwise Chrome paints a revealed page first and slots its images in a frame later. `measure()` (which runs again when an image or the fonts finish loading) calls `repaint()`, which drops the block's `will-change` for a frame. Chrome sometimes kept stale bits of the block's GPU layer after a fresh load, e.g. an album photo shown at an old size and place until the page was turned. `turn()` restores the layer at once. Don't use `mix-blend-mode` on pasted objects (the tape used to): it renders differently inside the turning leaf's layers, so the object changes tone mid-turn.
- Fonts are self-hosted through Astro's fonts API (`fonts` in `astro.config.mjs`, `<Font>` in BookLayout; the CSS tokens `--f-*` in `base.css` point at the `--font-*` variables). Cinzel Decorative is preloaded with `display: 'block'`: with Google Fonts' `swap`, the drop cap first painted in a stand-in font and visibly shrank when the real one arrived. Don't go back to a Google Fonts `<link>`.
- Drop caps (`typography.css`) are raised initials (`initial-letter: 3 1`) in Cinzel Decorative, which the user prefers over plain Cinzel. The capitals A G H J K L M N Q R S W X Z have flourishes that dip below the baseline (measured with canvas `measureText`). For those, the page sets `data-initial` on the `.dropcap` container at build time (`initialOf(entry.body)` in `src/lib/book.ts`), and the CSS gives `::first-line` `line-height: 2`, so line two wraps beside the flourish. Don't set it with client JS: a late attribute change makes the letter visibly resize on load. Chrome ignores vertical margin and padding on an initial-letter, so don't try those to move line two; `margin-left` does work, and the capitals whose arm or flourish reaches left of their box (D J M N T X, measured) get a wider one so they don't poke past the text's edge. Chrome bug with that `::first-line` line-height: on a paragraph's FIRST layout it sizes the initial by the first-line line-height (too big, ~23%), and only on later layouts by the paragraph's own. Any fresh layout hits it: page load, a reading-mode switch, the page-turn clones. `settleDropcaps()` (book-mode.ts, called in `setMode()` and after the turn's extras are appended) and an inline script at the end of BookLayout's body force a second layout before the first paint. Keep them. Also, Astro 7's `markdown.rehypePlugins` needs `@astrojs/markdown-remark` (not installed), and adding it breaks the config.
- Elements with `transform` create isolated groups: `mix-blend-mode` won't blend against the paper. Use the `#sketch-ink` SVG filter (BookLayout) instead.
- Decorations that stick out of a box (tape) must sit inside the object's padding, or they leak onto the previous column in book mode.
- Cover (`src/pages/index.astro`): clicking opens the cover (`.opening`), then navigates to `/contents`. The first page under the cover is an exact, scaled-down replica of the contents sheet (`ContentsBody.astro` inside `Sheet`, laid out at the real sheet width and scaled by `--k`). Its inner sheet (`.replica .sheet`, fixed at page proportions with `overflow: hidden`, so it is always the same size as the real sheet and the morph only animates transform) shares `view-transition-name: book-page` with the real sheet, so the cross-document View Transition (`base.css`) morphs one into the other. Browsers without cross-document transitions (no `PageRevealEvent`) get a zoom (`.zooming`) instead. On the cover, the name is set only while morphing (on click, or in `pagereveal`); never leave it on statically, or the hidden miniature pops over the closed cover during unrelated transitions.
- Returning to the cover from ANY book page: a `pageswap` script in BookLayout names that page's `[data-sheet]` element `book-page` when heading to the cover. `Sheet` and the letter/fragment wrappers carry `data-sheet`. Sheets taller than 1.6× the viewport, like scroll-mode chapters, are skipped and only fade. On the cover, a `<head>` script (with `<link rel="expect" blocking="render">`) opens the book instantly in `pagereveal`, lets the sheet shrink onto its page, then plays `.closing`. Both sheets use `.page-proportions` (3 : 4.1, the page's ratio) so their shapes match. Only `.cover` uses `preserve-3d` (for its front/back faces). Never put it on `.closed-book`, or the pages and cover intersect while rotating.
- Changes to the contents page go in `src/components/ContentsBody.astro`, and the cover's miniature follows automatically.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
