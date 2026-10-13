/**
 * Book mode: the text is laid out in CSS columns (one column = one page).
 * This script only works out how many spreads exist, moves the flow and
 * animates the page turn using clones of the book block.
 */

const DURATION = 750;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export type ReadingMode = 'book' | 'scroll';

export function currentMode(): ReadingMode {
	return document.documentElement.dataset.reading === 'book' ? 'book' : 'scroll';
}

export function setMode(mode: ReadingMode) {
	document.documentElement.dataset.reading = mode;
	// Switching modes lays the text out from scratch: the drop cap bug again
	settleDropcaps(document);
	try {
		localStorage.setItem('reading-mode', mode);
	} catch {}
	document.dispatchEvent(new CustomEvent('reading-mode', { detail: mode }));
}

/**
 * Chrome bug: the first time a paragraph is laid out, it sizes the
 * initial-letter by the ::first-line line-height (2 for swash capitals, see
 * typography.css), and only on later layouts by the paragraph's own (1.62),
 * which is the intended size. A fresh copy of a page (the page-turn clones)
 * would show its "A" too big. A throwaway style change forces the second,
 * correct layout before anything is painted. BookLayout does the same on load.
 */
export function settleDropcaps(root: ParentNode) {
	root.querySelectorAll<HTMLElement>('.dropcap > p:first-of-type').forEach((p) => {
		void p.offsetWidth;
		p.style.wordSpacing = '0.01px';
		void p.offsetWidth;
		p.style.wordSpacing = '';
	});
}

function initBook(book: HTMLElement) {
	const block = book.querySelector<HTMLElement>('.book-block')!;
	const end = book.querySelector<HTMLElement>('.flow-end')!;
	const prevButtons = book.querySelectorAll<HTMLButtonElement>('[data-turn="-1"]');
	const nextButtons = book.querySelectorAll<HTMLButtonElement>('[data-turn="1"]');
	const status = book.querySelector<HTMLElement>('.book-status')!;
	const storageKey = `spread:${location.pathname}`;

	let spread = 0;
	let totalSpreads = 1;
	let totalPages = 1;
	let pages = 2;
	let pageWidth = 0;
	let turning = false;

	try {
		spread = Number(sessionStorage.getItem(storageKey)) || 0;
	} catch {}

	/** Puts a block (the real one or a clone) at a given spread. */
	function show(target: HTMLElement, s: number) {
		target.querySelector<HTMLElement>('.book-flow')!.style.setProperty('--spread', String(s));
		const left = target.querySelector<HTMLElement>('.page-num.left');
		const right = target.querySelector<HTMLElement>('.page-num.right');
		const first = s * pages + 1;
		if (left) left.textContent = first <= totalPages ? String(first) : '';
		if (right) right.textContent = first + 1 <= totalPages ? String(first + 1) : '';
	}

	function updateControls() {
		prevButtons.forEach((b) => (b.disabled = spread <= 0));
		nextButtons.forEach((b) => (b.disabled = spread >= totalSpreads - 1));
		const first = spread * pages + 1;
		const last = Math.min(first + pages - 1, totalPages);
		status.textContent =
			first === last ? `Page ${first} of ${totalPages}` : `Pages ${first}–${last} of ${totalPages}`;
		try {
			sessionStorage.setItem(storageKey, String(spread));
		} catch {}
	}

	function measure() {
		if (currentMode() !== 'book' || turning) return;
		const firstPage = spread * pages;
		pages = Number(getComputedStyle(book).getPropertyValue('--pages')) || 2;
		pageWidth = block.clientWidth / pages;
		// Not laid out yet (hidden tab or zero-size window): measure again on the next resize
		if (pageWidth <= 0) return;
		const flow = block.querySelector<HTMLElement>('.book-flow')!;
		const x = end.getBoundingClientRect().left - flow.getBoundingClientRect().left;
		totalPages = Math.max(1, Math.floor(x / pageWidth + 0.02) + 1);
		totalSpreads = Math.ceil(totalPages / pages);
		spread = Math.min(Math.floor(firstPage / pages), totalSpreads - 1);
		show(block, spread);
		updateControls();
		prepareBitmaps();
		repaint();
	}

	/**
	 * The book block is its own GPU layer (will-change), and Chrome sometimes
	 * keeps stale bits of it after an image or font loads: on a fresh load, a
	 * pasted photo showed at an old size and place until the page was turned.
	 * Dropping the layer for one frame makes Chrome paint the page anew; the
	 * page looks the same either way, so nothing shows.
	 */
	let repaintFrame = 0;
	function repaint() {
		cancelAnimationFrame(repaintFrame);
		block.style.willChange = 'auto';
		repaintFrame = requestAnimationFrame(() => {
			repaintFrame = requestAnimationFrame(() => (block.style.willChange = ''));
		});
	}

	/**
	 * In book mode the pages ahead sit outside the visible window, so lazy
	 * images there would never load. A clone made for a page turn would then
	 * lay out without them (text in the wrong place) and snap when they
	 * arrive. Load every image in the chapter up front instead.
	 */
	function loadAllImages() {
		block.querySelectorAll<HTMLImageElement>('.book-flow img').forEach((img) => {
			img.loading = 'eager';
			// Chrome may paint a newly revealed page first and slot its images in
			// a frame later while it decodes them: the pasted objects blink as a
			// page turns. `sync` tells it never to paint the page without them.
			img.decoding = 'sync';
		});
	}

	/** Have the page's own images decoded before they get revealed. */
	function decodePageImages() {
		const imgs = [...block.querySelectorAll<HTMLImageElement>('.book-flow img')];
		return Promise.all(imgs.map((img) => img.decode().catch(() => {})));
	}

	/**
	 * Bitmaps of the chapter's images, drawn once and reused by every turn,
	 * so a click never has to render an image again. Keyed by image and size,
	 * since a resize changes the size an image is shown at.
	 */
	const bitmaps = new Map<HTMLImageElement, HTMLCanvasElement>();

	function bitmapOf(img: HTMLImageElement, w: number, h: number) {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const cw = Math.max(1, Math.round(w * dpr));
		const ch = Math.max(1, Math.round(h * dpr));
		let bmp = bitmaps.get(img);
		if (!bmp || bmp.width !== cw || bmp.height !== ch) {
			if (!img.complete || !img.naturalWidth) return null;
			bmp = document.createElement('canvas');
			bmp.width = cw;
			bmp.height = ch;
			try {
				bmp.getContext('2d')!.drawImage(img, 0, 0, cw, ch);
			} catch {
				return null; // e.g. a cross-origin image: fall back to the plain <img>
			}
			bitmaps.set(img, bmp);
		}
		return bmp;
	}

	/** A <canvas> that looks exactly like `img` does on the page right now. */
	function snapshot(img: HTMLImageElement) {
		const w = img.offsetWidth;
		const h = img.offsetHeight;
		const bmp = w && h ? bitmapOf(img, w, h) : null;
		if (!bmp) return null;
		const canvas = document.createElement('canvas');
		canvas.width = bmp.width;
		canvas.height = bmp.height;
		canvas.getContext('2d')!.drawImage(bmp, 0, 0);
		const cs = getComputedStyle(img);
		Object.assign(canvas.style, {
			display: cs.display,
			width: `${w}px`,
			height: `${h}px`,
			margin: cs.margin,
			filter: cs.filter,
			opacity: cs.opacity,
			maskImage: cs.maskImage,
			maskComposite: cs.maskComposite,
		});
		canvas.setAttribute('aria-hidden', 'true');
		return canvas;
	}

	/** Draw the bitmaps ahead of time, so the first turn doesn't pay for it. */
	function prepareBitmaps() {
		block.querySelectorAll<HTMLImageElement>('.book-flow img').forEach((img) => {
			if (img.offsetWidth && img.offsetHeight) bitmapOf(img, img.offsetWidth, img.offsetHeight);
		});
	}

	/** A face shows one page (slot 0 = left, 1 = right) of a spread. */
	function face(s: number, slot: number, className: string) {
		const el = document.createElement('div');
		el.className = `face ${className}`;
		const clone = block.cloneNode(true) as HTMLElement;
		clone.classList.add('clone');
		clone.setAttribute('aria-hidden', 'true');
		clone.querySelectorAll('.turning-leaf, .underlay').forEach((n) => n.remove());
		// Cloned <img>s are the page turn's weak spot: a fresh <img> first has no
		// size (the spread reflows for a frame) and, even once loaded, Chrome
		// renders it again from scratch (costly for SVGs), so it shows up a frame
		// late: the images blink. Swap each one for a <canvas> snapshot of the
		// original, which is on screen the moment it's inserted, at the exact
		// size and with the same CSS filter/opacity.
		const originals = block.querySelectorAll<HTMLImageElement>('.book-flow img');
		clone.querySelectorAll<HTMLImageElement>('.book-flow img').forEach((img, i) => {
			const original = originals[i];
			const canvas = original && snapshot(original);
			if (canvas) img.replaceWith(canvas);
		});
		clone.style.left = `${-slot * pageWidth}px`;
		show(clone, s);
		el.append(clone);
		return el;
	}

	function turn(direction: 1 | -1) {
		const target = spread + direction;
		if (turning || target < 0 || target >= totalSpreads) return;
		const from = spread;

		if (reducedMotion.matches) {
			spread = target;
			show(block, spread);
			updateControls();
			return;
		}

		turning = true;
		// The turn needs the page on its layer (see repaint())
		cancelAnimationFrame(repaintFrame);
		block.style.willChange = '';
		const twoPages = pages === 2;
		const extras: HTMLElement[] = [];

		const leaf = document.createElement('div');
		leaf.className = `turning-leaf ${direction === 1 ? 'forward' : 'backward'}`;
		leaf.style.setProperty('--turn-duration', `${DURATION}ms`);
		extras.push(leaf);

		let frames: Keyframe[];
		// Whether the page underneath switches when the turn starts (true) or
		// only once the leaf has landed on top of it (false).
		let switchAtStart = true;

		if (direction === 1) {
			// The right page (or the only one) lifts from the spine on its left.
			const slot = twoPages ? 1 : 0;
			leaf.style.left = `${slot * pageWidth}px`;
			leaf.style.transformOrigin = 'left center';
			leaf.append(face(from, slot, 'front'));
			if (twoPages) {
				leaf.append(face(target, 0, 'back'));
				const underlay = face(from, 0, 'underlay');
				underlay.style.left = '0px';
				extras.push(underlay);
			}
			frames = [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }];
		} else if (twoPages) {
			// The left page swings back over the spine on its right.
			leaf.style.left = '0px';
			leaf.style.transformOrigin = 'right center';
			leaf.append(face(from, 0, 'front'), face(target, 1, 'back'));
			const underlay = face(from, 1, 'underlay');
			underlay.style.left = `${pageWidth}px`;
			extras.push(underlay);
			frames = [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }];
		} else {
			// Single page: the previous leaf comes back down on top.
			leaf.style.left = '0px';
			leaf.style.transformOrigin = 'left center';
			leaf.append(face(target, 0, 'front'));
			frames = [{ transform: 'rotateY(-180deg)' }, { transform: 'rotateY(0deg)' }];
			switchAtStart = false;
		}

		// Park the leaf in its starting pose. Until the animation starts it
		// looks exactly like the page it covers, so adding it changes nothing
		// on screen.
		leaf.style.transform = frames[0].transform as string;
		block.append(...extras);
		extras.forEach(settleDropcaps);
		spread = target;
		updateControls();

		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			// The leaf has landed and looks exactly like the new page: switch
			// underneath first, and only take the leaf away once that is painted.
			show(block, spread);
			afterPaint(() => {
				extras.forEach((e) => e.remove());
				turning = false;
			});
		};

		// Heavy clones (paper, torn edges, images) may take a frame to draw.
		// Only switch the page underneath and start turning once the clones'
		// images are decoded and the leaf is on screen; otherwise something
		// flashes for a frame.
		const cloneImages = extras.flatMap((e) => [...e.querySelectorAll('img')]);
		const decoded = Promise.all([
			...cloneImages.map((img) => img.decode().catch(() => {})),
			// ...and the real page's, which the turn is about to reveal underneath
			decodePageImages(),
		]);
		const timeLimit = new Promise((r) => setTimeout(r, 300)); // never wait long for a broken image
		Promise.race([decoded, timeLimit]).then(() => afterPaint(() => {
			if (switchAtStart) show(block, target);
			// `fill: forwards` keeps the leaf in its landed pose until it is removed
			const anim = leaf.animate(frames, {
				duration: DURATION,
				easing: 'cubic-bezier(.42,.06,.3,1)',
				fill: 'forwards',
			});
			anim.finished.then(finish, finish);
			// Animations pause in background tabs, so never leave the book stuck
			// there. But only cut a turn short when the tab is hidden: while it is
			// visible the animation may just have started late (heavy first frame)
			// or be slowed down in DevTools, and cutting it made the page snap.
			const fallback = () => {
				if (done) return;
				if (!document.hidden && anim.playState === 'running') setTimeout(fallback, 500);
				else finish();
			};
			setTimeout(fallback, DURATION + 250);
		}));
	}

	/** Runs `fn` once what is in the DOM now has been painted (two frames). */
	function afterPaint(fn: () => void) {
		let ran = false;
		const run = () => {
			if (!ran) {
				ran = true;
				fn();
			}
		};
		requestAnimationFrame(() => requestAnimationFrame(run));
		setTimeout(run, 120); // rAF doesn't run in background tabs
	}

	prevButtons.forEach((b) => b.addEventListener('click', () => turn(-1)));
	nextButtons.forEach((b) => b.addEventListener('click', () => turn(1)));

	document.addEventListener('keydown', (e) => {
		if (currentMode() !== 'book' || e.altKey || e.ctrlKey || e.metaKey) return;
		const t = e.target as HTMLElement;
		if (t.closest('input, textarea, select, [contenteditable]')) return;
		if (e.key === 'ArrowRight' || e.key === 'PageDown') {
			e.preventDefault();
			turn(1);
		} else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
			e.preventDefault();
			turn(-1);
		}
	});

	// Swipe on touch screens
	let startX: number | null = null;
	let startY = 0;
	block.addEventListener('pointerdown', (e) => {
		if (e.pointerType === 'mouse') return;
		startX = e.clientX;
		startY = e.clientY;
	});
	block.addEventListener('pointerup', (e) => {
		if (startX === null) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		startX = null;
		if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) turn(dx < 0 ? 1 : -1);
	});
	block.addEventListener('pointercancel', () => (startX = null));

	// Re-measure whenever something changes the text's size
	let scheduled = 0;
	const scheduleMeasure = () => {
		cancelAnimationFrame(scheduled);
		scheduled = requestAnimationFrame(measure);
	};
	new ResizeObserver(scheduleMeasure).observe(book);
	block.addEventListener('load', scheduleMeasure, true);
	document.fonts?.ready.then(scheduleMeasure);

	document.addEventListener('reading-mode', () => {
		if (currentMode() === 'book') {
			loadAllImages();
			scheduleMeasure();
			book.scrollIntoView({ block: 'start', behavior: 'smooth' });
		}
	});

	if (currentMode() === 'book') loadAllImages();
	measure();
}

document.querySelectorAll<HTMLElement>('[data-book]').forEach(initBook);
