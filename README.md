# Footnotes to a Greater Tale

The chronicle of Malrien Vealwood (FFXIV RP), styled as an old book: aged paper, torn edges, drop caps, photos taped in, letters with wax seals. It can be read two ways: **scroll** (one long page) or **book** (two-page spreads you turn).

Built with [Astro](https://astro.build). No database: every chapter is a text file.

---

## Running it locally

```bash
npm install      # first time only
npm run dev      # opens at http://localhost:4321/footnotes-to-a-greater-tale/
```

While `npm run dev` is running, every file you save shows up in the browser immediately.

---

## Where things live

| What | Folder |
|---|---|
| Chapters | `src/content/chapters/` |
| Notes, letters, fragments | `src/content/notes/` |
| Characters (Dramatis Personae) | `src/content/characters/` |
| Glossary | `src/content/glossary/` |
| Malrien's profile | `src/content/profile/malrien.mdx` |
| Images | `public/images/` |

The texts that ship with the project are **samples**. Delete or rewrite them freely.

---

## Writing a new chapter

Create a file in `src/content/chapters/`, for example `03-the-broken-bridge.mdx`:

```mdx
---
title: "The Broken Bridge"
number: 3
location: "Western Coerthas"            # optional
world_date: "12th Sun of the Astral Moon" # optional, free text
summary: "Shown on the contents page."   # optional
draft: true                              # optional: hides it from the published site
---

First paragraph. The first letter becomes a drop cap automatically.

Another paragraph. *Italics* with asterisks, **emphasis** with two.

## A heading inside the chapter

---

(three hyphens on their own line become a ❦ flourish)
```

- The **file name** becomes the page address (`/chapters/03-the-broken-bridge`).
- The **number** sets the order on the contents page and is shown in Roman numerals.
- With `draft: true`, the chapter only appears in `npm run dev`, stamped "Draft".

---

## Pasted objects (what makes the book feel alive)

Use them in any chapter, note, character or the profile. No imports needed.

Put images in `public/images/` and reference them with a path starting with `/images/...`.

Most of them accept:
- `position="left" | "right" | "center"`: where the object sits, with the text flowing around it;
- `tilt={-4}`: how many degrees it's crooked (omit it for a "natural" random tilt);
- `width={40}`: width as a % of the page.

### Photo

```mdx
<Photo src="/images/bridge.png" caption="The bridge, before it fell" />
<Photo src="/images/bridge.png" tape="album" position="left" />
```
`tape`: `"corners"` (default, two strips), `"top"` (one strip on top), `"album"` (photo-album corners) or `"none"`.

### Note

```mdx
<Note tilt={-5} color="yellow">
  Don't forget: return the Wanderer's quill.
</Note>
```
`color`: `"cream"`, `"yellow"` or `"blue"`. `tape={false}` removes the tape.

### Letter with a wax seal

```mdx
<Letter to="Dear Malrien" from="Your mother" date="Coerthas, winter" seal="M">
  First paragraph of the letter.

  Second paragraph.
</Letter>
```

### Sketch (drawn right on the page)

```mdx
<Sketch src="/images/tower-drawing.png" caption="Drawn from memory" />
```
Works best with drawings on a white background: the white disappears and the lines become the page's ink.
For a drawing made on tinted paper or parchment, add `paper="tinted"`: a stronger filter removes that paper too, and the edges fade into the page.
(For a character or profile portrait, the same thing is `portrait_style: sketch` plus `portrait_paper: tinted` in the frontmatter.)

### Keepsake (flower, feather, ticket...)

```mdx
<Keepsake src="/images/feather.png" caption="His feather" tape />
```
Use a PNG with a transparent background.

### Margin note

```mdx
<MarginNote>That isn't quite true.</MarginNote>
```
On wide screens it sits in the side margin. On phones and in book mode it sits beside the text.

### Stains

```mdx
<Stain kind="ink" />
<Stain kind="coffee" side="left" rotate={30} />
<Stain kind="burn" size={120} />
```

> **About FFXIV screenshots:** they're usually huge (4K, several MB). Before adding them to the site, shrink them to about 1200px wide and save as `.jpg` or `.webp`. Pages will load much faster.

---

## Notes, characters and glossary

**Note** (`src/content/notes/`):
```mdx
---
title: "A letter I never sent"
kind: letter          # letter | diary | fragment
to: "Mother"          # letters only
from: "Malrien"
world_date: "Ishgard, Umbral Moon"
seal: "M"             # letter on the wax seal (letters)
order: 1              # position in the list
---
Text...
```

**Character** (`src/content/characters/`):
```mdx
---
name: "The Wanderer"
epithet: "the man with the unlit lantern"
relation: "mentor"
portrait: "/images/wanderer.png"   # optional
order: 1
---
What Malrien thinks of this person...
```

**Glossary** (`src/content/glossary/`):
```mdx
---
term: "Ishgard"
kind: place   # place | term | faction | object | creature
---
Short description.
```

**Profile** (`src/content/profile/malrien.mdx`): with no `fields`, the portrait sits alone, centred under the name and title. To list details beside it, add free-form `fields` to the frontmatter (e.g. `fields: { Race: "Miqo'te" }`); they show in the order written.

---

## Publishing

The book is live at **https://malrien.github.io/footnotes-to-a-greater-tale/**, hosted on GitHub Pages.

Every push to `main` publishes by itself, in about 2 minutes (`.github/workflows/deploy.yml`):

```bash
git add .
git commit -m "Chapter I"
git push
```

- Only entries with `draft: false` (or no `draft` line) go on the site. Drafts stay visible in `npm run dev` only.
- The repository is public: a draft is hidden from the site, but anyone can read its file on GitHub once it is pushed.
- If a push doesn't show up, look at the repository's **Actions** tab for the failed run.
- The address ends in the repository's name. If the repository is ever renamed, change `base` in `astro.config.mjs` to match.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Runs the site locally, refreshing on save |
| `npm run build` | Builds the final site into `dist/` (and reports content errors) |
| `npm run preview` | Serves the built site, as it will look once published |
