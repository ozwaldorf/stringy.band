<script lang="ts">
	import { tick, untrack } from 'svelte';
	import IconDownload from '~icons/carbon/download';
	import IconInstall from '~icons/carbon/mobile-download';
	import IconShare from '~icons/carbon/share';
	import logoArt from './lib/assets/logo.svg?raw';
	import beanArt from './lib/assets/bean-a.svg?raw';
	import littleBeanArt from './lib/assets/bean-b.svg?raw';
	import lutUrl from './lib/assets/gruvbox-dark-hard-hald-12.png';
	import data from './lib/shows.json';
	import type { Show } from './lib/bandsintown';
	import { flierFields, flierFilename, isLight, palettesFor, PALETTES, qrTags, tintLogo, type LogoTint, QR_TILES, type FlierFields } from './lib/flier';
	import {
		applyLut,
		DESIGNS,
		LAYOUT_SHAPES,
		SHAPES,
		drawFlier,
		FONTS,
		HEIGHT,
		loadImage,
		loadLut,
		lutColor,
		photoTone,
		PAD,
		PHOTO_HEIGHT,
		photoCrop,
		svgImage,
		WIDTH,
		type Box,
		type Design,
		type Shape,
		type FlierArt,
		type Frame,
		type FlierLayout,
		type Lut,
		type TextBox,
		type TextKey
	} from './lib/flier-canvas';
	import { landscapePhotos, portraitPhotos, type Photo } from './lib/photos';
	import './lib/styles/shop.css';

	type Key = TextKey | 'photo' | 'colour' | 'qr';

	const CALLOUTS: { key: Key; label: string }[] = [
		{ key: 'photo', label: 'Photo' },
		{ key: 'venue', label: 'Venue' },
		{ key: 'address', label: 'Address' },
		{ key: 'time', label: 'Time' },
		{ key: 'date', label: 'Date' },
		{ key: 'entry', label: 'Entry' },
		{ key: 'colour', label: 'Colour' },
		{ key: 'tagline', label: 'Tagline' },
		{ key: 'qr', label: 'QR code' }
	];
	const TEXT_KEYS: Key[] = ['venue', 'address', 'time', 'date', 'entry', 'tagline'];
	const isText = (key: Key | null): key is TextKey => !!key && TEXT_KEYS.includes(key);
	const PLACEHOLDERS: Record<TextKey, string> = {
		venue: 'Venue',
		address: 'Street,\nTown, NY 12866',
		time: '8-11PM',
		date: 'Friday, August 21st',
		entry: 'Free entry',
		tagline: 'Featuring special guests!'
	};

	const shows: Show[] = data.shows.map((s) => ({ ...s, start: new Date(s.start), end: new Date(s.end) }));
	const now = Date.now();
	// Upcoming soonest first, then past most recent first
	const groups = [
		{ label: 'Upcoming', shows: shows.filter((s) => s.end.getTime() >= now) },
		{ label: 'Past', shows: shows.filter((s) => s.end.getTime() < now).reverse() }
	].filter((g) => g.shows.length);
	const choices = groups.flatMap((g) => g.shows);
	const allPhotos = [...landscapePhotos, ...portraitPhotos];
	const folder = (name: string) => name.split('/')[0];
	// Group shots for the one photo layouts; the member folders hold solo portraits, which the strip takes too
	const photos = allPhotos.filter((p) => folder(p.name) === 'band');
	const members = [...new Set(allPhotos.map((p) => folder(p.name)))].filter((m) => m !== 'band');
	const STRIP_MAX = 5;
	const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
	// A solo shot from each of `n` members, chosen at random
	const castShots = (n: number) =>
		[...members]
			.sort(() => Math.random() - 0.5)
			.slice(0, n)
			.map((m) => pick(allPhotos.filter((p) => folder(p.name) === m)).name);
	// A photo by its name, or an upload by its object URL, and how it sits in its frame
	type Shot = { name: string; zoom: number; panX: number; panY: number };
	// Framed afresh from its top, where the faces usually are
	const framed = (name: string): Shot => ({ name, zoom: 1, panX: 0.5, panY: 0 });
	const imageSrc = (name: string) => (name.startsWith('blob:') ? name : `/images/${name}.webp`);
	// Rasterised at twice the drawn width so the logo stays crisp at full size
	const LOGO_PIXELS = 1840;
	const CALLOUT_GAP = 8;
	const polarIcon = (r: (t: number) => number, steps: number) =>
		Array.from({ length: steps }, (_, i) => {
			const t = (i / steps) * Math.PI * 2 - Math.PI / 2;
			return `${i ? 'L' : 'M'}${(12 + Math.cos(t) * 10 * r(t)).toFixed(2)} ${(12 + Math.sin(t) * 10 * r(t)).toFixed(2)}`;
		}).join('') + 'Z';
	const SHAPE_ICONS: Record<Shape, string> = {
		arch: 'M3 28V12a9 9 0 0 1 18 0v16z',
		oval: 'M12 2a9 13 0 1 0 0.01 0z',
		rounded: 'M7 2h10a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z',
		hexagon: 'M12 1l10 7v14l-10 7-10-7V8z',
		circle: 'M12 2a10 10 0 1 0 0.01 0z',
		square: 'M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z',
		flower: polarIcon((t) => 0.9 + 0.1 * Math.cos(10 * t), 120),
		burst: polarIcon((t) => (Math.round(((t + Math.PI / 2) / (Math.PI * 2)) * 32) % 2 ? 0.86 : 1), 32)
	};
	// Two 13rem gutters with their 3rem gaps, and a flier at least 24rem wide
	const MIN_SIDE_WIDTH = (13 * 2 + 3 * 2 + 24) * 16;

	let showId = $state(choices[0]?.uid ?? '');
	let fields = $state<FlierFields>(
		choices[0]
			? flierFields(choices[0])
			: { venue: '', address: '', time: '', date: '', entry: 'Free entry', tagline: '', link: 'https://stringy.band/' }
	);
	let paletteName = $state('Teal');
	let qrTile = $state(QR_TILES[0].name);
	let design = $state<Design>('classic');
	// The first is the photo every layout shows; the strip shows as many as it has frames
	let shots = $state<Shot[]>([framed(photos[0].name), ...castShots(STRIP_MAX - 1).map(framed)]);
	let uploads = $state<string[]>([]);
	let stripCount = $state(4);
	// How many photos the layout shows, each in a frame of its own
	const frameCount = $derived(design === 'strip' ? stripCount : design === 'multishape' ? 2 : 1);
	// The frame the photo settings and drags act on
	let sel = $state(0);
	const frame = $derived(frameCount > 1 ? sel : 0);
	const shot = $derived(shots[frame]);
	let shape = $state<Shape>('arch');
	// The second photo's shape in the multi shapes layout
	let secondShape = $state<Shape>('circle');
	// Shapes start at their largest
	let shapeScale = $state(1);
	let secondShapeScale = $state(1);
	let printScale = $state(0.9);
	let photoHeight = $state(PHOTO_HEIGHT);
	let active = $state<Key | null>(null);

	let canvas = $state<HTMLCanvasElement>();
	let stage = $state<HTMLElement>();
	let sheet = $state<HTMLElement>();
	let sheetWidth = $state(0);
	// The lines span the whole stage, so they redraw when it changes size even if the flier does not
	let stageWidth = $state(0);
	let stageHeight = $state(0);
	// Phones open settings under the flier rather than over it
	let narrow = $state(false);
	// Loaded photos by name
	let images = $state.raw<Record<string, HTMLImageElement>>({});
	const loads = new Map<string, Promise<HTMLImageElement>>();
	// The photo the settings and drags act on
	const photo = $derived(images[shot.name]);
	// Photos recoloured with the Gruvbox LUT, graded once each
	let grade = $state(true);
	let lut = $state.raw<Lut>();
	const gradedCache = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
	let bean = $state.raw<HTMLImageElement>();
	let littleBean = $state.raw<HTMLImageElement>();
	// Each tint of the logo, drawn once; keyed by the tinted art so a retuned tint draws afresh
	const logos = new Map<string, Promise<HTMLImageElement>>();
	let logo = $state.raw<{ tint: LogoTint; img: HTMLImageElement }>();
	const art = $derived(bean && littleBean && logo ? { bean, littleBean, logo: logo.img } : undefined);
	let layout = $state.raw<FlierLayout>();
	let placed = $state.raw<{ tops: Partial<Record<Key, number>>; lines: { key: Key; points: string; x: number; y: number; empty: boolean }[] }>({
		tops: {},
		lines: []
	});
	let fontsReady = $state(false);
	// Each visit opens on a random look, drawn once it is all ready
	let ready = $state(false);
	let opening = false;
	let error = $state('');
	const callouts: Partial<Record<Key, HTMLElement>> = $state({});

	// Text labels sit on the side their text is aligned to; photo left, colour and QR code right
	const sideOf = (key: Key): 'left' | 'right' => {
		if (key === 'photo') return 'left';
		if (!isText(key)) return 'right';
		const box = layout?.text[key];
		return box?.side ?? (box?.align === 'right' ? 'right' : 'left');
	};
	const visible = $derived(CALLOUTS.map((c) => ({ ...c, side: sideOf(c.key) })));
	const palette = $derived(PALETTES.find((p) => p.name === paletteName) ?? PALETTES[0]);
	const tileBg = $derived(QR_TILES.find((t) => t.name === qrTile)?.bg ?? null);
	// The code already sits on a tile coloured background, so no tile choice changes it
	const tileless = $derived(!!layout && QR_TILES.some((t) => t.bg === layout!.qr.behind));
	// The picker's photos by folder; with one photo, group shots and whatever the photo is now
	const photoGroups = $derived.by(() => {
		const pool = frameCount > 1 ? allPhotos : photos.concat(allPhotos.filter((p) => p.name === shot.name && !photos.includes(p)));
		return [...new Set(pool.map((p) => folder(p.name)))].map((f) => ({
			label: f[0].toUpperCase() + f.slice(1),
			photos: pool.filter((p) => folder(p.name) === f)
		}));
	});
	// The shape and size the photo settings show and set: the second photo's in the multi shapes layout
	const frameShape = $derived(design === 'multishape' && frame === 1 ? secondShape : shape);
	function setFrameShape(name: Shape) {
		if (design === 'multishape' && frame === 1) secondShape = name;
		else shape = name;
	}
	const frameScale = $derived(design === 'multishape' && frame === 1 ? secondShapeScale : shapeScale);
	function setFrameScale(value: number) {
		if (design === 'multishape' && frame === 1) secondShapeScale = value;
		else shapeScale = value;
	}

	// The box the photo settings and drags act on
	const photoBox = $derived(layout && (layout.frames?.[frame] ?? layout.photo));
	// Flier pixels to preview pixels
	const k = $derived(sheetWidth / WIDTH);

	function pickShow() {
		const show = choices.find((s) => s.uid === showId);
		if (show) fields = flierFields(show);
	}

	// The photo as drawn: graded once the grade is in, plain until then
	function shown(name: string) {
		const img = images[name];
		if (!img || !grade || !lut) return img;
		let canvas = gradedCache.get(img);
		if (!canvas) gradedCache.set(img, (canvas = applyLut(img, lut)));
		return canvas;
	}

	// Loaded once each, and graded as it lands; callers handle a failure
	function load(name: string) {
		let loading = loads.get(name);
		if (!loading) {
			loading = loadImage(imageSrc(name)).then((img) => {
				images = { ...images, [name]: img };
				shown(name);
				return img;
			});
			loading.catch(() => loads.delete(name));
			loads.set(name, loading);
		}
		return loading;
	}

	// Another photo from `pool`, loaded and graded before anything changes, so it swaps in whole
	let rolls = 0;
	async function nextPhoto(pool: Photo[], current: string) {
		const name = pick(pool.filter((p) => p.name !== current)).name;
		return { name, img: await load(name).catch(() => undefined) };
	}

	async function pickRandom() {
		const [roll, i] = [++rolls, frame];
		const next = await nextPhoto(frameCount > 1 ? allPhotos : photos, shots[i].name);
		if (roll === rolls) shots[i] = framed(next.name);
	}

	// A fresh look: layout, photos and QR code, and a colour picked to suit the photo as it will
	// show after the grade; the text stays. All of it lands together once the photos are ready.
	async function randomize() {
		const roll = ++rolls;
		const cast = castShots(STRIP_MAX - 1);
		const [next] = await Promise.all([nextPhoto(photos, shots[0].name), ...cast.map((name) => load(name).catch(() => undefined))]);
		if (roll !== rolls) return;
		const others = PALETTES.filter((p) => p.name !== paletteName);
		const tone = next.img && photoTone(next.img);
		const ranked = tone ? palettesFor(grade && lut ? lutColor(tone, lut) : tone).filter((p) => p.name !== paletteName) : others;
		design = pick(DESIGNS.filter((d) => d.name !== design)).name;
		shape = pick(LAYOUT_SHAPES[design] ?? SHAPES.map((c) => c.name));
		secondShape = pick(SHAPES.filter((c) => c.name !== shape)).name;
		shapeScale = 1;
		secondShapeScale = 1;
		qrTile = pick(QR_TILES.filter((t) => t.bg)).name;
		paletteName = pick(ranked.slice(0, 3)).name;
		shots = [framed(next.name), ...cast.map(framed)];
		stripCount = 3;
	}

	// Kept for the session, since any frame can show any upload
	function pickUpload(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		const url = URL.createObjectURL(file);
		uploads = [...uploads, url];
		shots[frame].name = url;
	}

	$effect(() => {
		if (sel >= frameCount) sel = frameCount - 1;
	});

	$effect(() => {
		const allowed = LAYOUT_SHAPES[design];
		if (allowed && !allowed.includes(untrack(() => shape))) shape = allowed[0];
	});

	// An element's size, reported a frame later: the layout it feeds can change that size again,
	// which, answered within the same frame, loops the browser's resize observer
	function watchSize(report: (width: number, height: number) => void) {
		return (el: HTMLElement) => {
			let frame = 0;
			const observer = new ResizeObserver(() => {
				cancelAnimationFrame(frame);
				frame = requestAnimationFrame(() => report(el.clientWidth, el.clientHeight));
			});
			observer.observe(el);
			return () => {
				cancelAnimationFrame(frame);
				observer.disconnect();
			};
		};
	}

	// A press anywhere but the flier and its settings lets go of whatever is selected
	function deselect(event: PointerEvent) {
		if (!(event.target as Element).closest('.sheet, .callout, .panel, .toolbar')) active = null;
	}

	function openCallout(key: Key) {
		if (isText(key)) openEditor(key);
		else active = active !== key ? key : null;
	}

	$effect(() => {
		void svgImage(beanArt, 256).then((img) => (bean = img));
		void svgImage(littleBeanArt, 256).then((img) => (littleBean = img));
		// Every tint drawn up front, so a new colour never waits on its logo
		for (const p of PALETTES) {
			const svg = tintLogo(logoArt, p.logo);
			if (!logos.has(svg)) logos.set(svg, svgImage(svg, LOGO_PIXELS));
		}
		void Promise.all(FONTS.map((font) => document.fonts.load(font))).finally(() => (fontsReady = true));
	});

	// Try the side callouts again whenever the room for them changes; place() falls back
	// to the stacked layout if their open menus will not fit beside the flier
	// Where the side callouts last failed to fit. The stacked layout can bring in a scrollbar that
	// narrows the page, so only a clearly wider page, or another layout, is worth trying again.
	let failed = $state<{ width: number; design: Design }>();
	$effect(() => {
		narrow = stageWidth < MIN_SIDE_WIDTH || (failed?.design === design && stageWidth <= failed.width + 40);
	});

	// Every photo on show; a random pick has usually loaded its own ahead
	$effect(() => {
		for (const { name } of shots.slice(0, frameCount)) {
			load(name).then(
				() => (error = ''),
				() => (error = 'That photo could not be loaded.')
			);
		}
	});

	$effect(() => {
		const tint = palette.logo;
		const svg = tintLogo(logoArt, tint);
		if (!logos.has(svg)) logos.set(svg, svgImage(svg, LOGO_PIXELS));
		let current = true;
		void logos.get(svg)!.then((img) => current && (logo = { tint, img }));
		return () => (current = false);
	});

	$effect(() => {
		if (opening || (grade && !lut && !error)) return;
		opening = true;
		void untrack(randomize).finally(() => (ready = true));
	});

	$effect(() => {
		if (!grade || lut) return;
		loadLut(lutUrl).then(
			(loaded) => (lut = loaded),
			() => (error = 'The colour grade could not be loaded.')
		);
	});

	const toFrame = (s: Shot): Frame => ({ photo: shown(s.name), zoom: s.zoom, pan: [s.panX, s.panY] });

	// A failure drawing shows on the page, which keeps working, rather than stopping the preview for good
	let fault = $state('');
	const describe = (err: unknown) => (err instanceof Error ? `${err.name}: ${err.message}` : String(err));

	$effect(() => {
		const ctx = canvas?.getContext('2d');
		if (!ctx || !art || !fontsReady || !ready) return;
		try {
			layout = drawFlier(
				ctx,
				$state.snapshot(fields),
				palette,
				{ tile: tileBg },
				{
					...art,
					design,
					shape,
					secondShape,
					shapeScale,
					secondShapeScale,
					printScale,
					height: photoHeight,
					...toFrame(shots[0]),
					frames: frameCount > 1 ? shots.slice(0, frameCount).map(toFrame) : []
				},
				isText(active) ? active : undefined
			);
		} catch (err) {
			// Drop any drawing state the failed pass left behind
			ctx.reset?.();
			fault = `Drawing failed: ${describe(err)}`;
			console.error(err);
		}
	});

	$effect(() => {
		const onError = (event: ErrorEvent) => (fault = describe(event.error ?? event.message));
		const onRejection = (event: PromiseRejectionEvent) => (fault = describe(event.reason));
		window.addEventListener('error', onError);
		window.addEventListener('unhandledrejection', onRejection);
		return () => {
			window.removeEventListener('error', onError);
			window.removeEventListener('unhandledrejection', onRejection);
		};
	});

	// Where each leader line meets its element, in flier pixels
	function anchor(key: Key, l: FlierLayout): [number, number] | undefined {
		if (key === 'photo') {
			const f = l.frames?.[frame];
			return f ? [f.x + 28, f.y + f.h / 2] : (l.photoAnchor ?? [l.photo.x + 28, l.photo.y + l.photo.h * 0.3]);
		}
		if (key === 'colour') return l.field;
		if (key === 'qr') return [l.qr.x + l.qr.w + 14, l.qr.y + l.qr.h / 2];
		const box = l.text[key];
		if (!box) return;
		if (box.anchor && sideOf(key) === 'left') return box.anchor;
		// Right aligned text meets its callout at its right end, or at its left when the callout is on the left
		if (box.align === 'right') return [sideOf(key) === 'left' ? box.x - 14 : box.x + box.w + 14, box.baselines[0] - box.size * 0.3];
		// A right hand label meets left aligned text where it ends
		return sideOf(key) === 'right' ? [box.end + 14, box.y + box.h / 2] : [box.x - 14, box.y + box.h / 2];
	}

	// A callout's place down its column: where its line meets the flier, unless the layout says otherwise
	const sortY = (key: Key, a?: [number, number]) => layout?.text[key as TextKey]?.sortY ?? a?.[1] ?? 0;

	// Each callout sits level with its element, pushed apart where they would overlap
	function place() {
		if (!layout || !stage || !sheet || narrow) return void (placed = { tops: {}, lines: [] });
		const s = stage.getBoundingClientRect();
		const r = sheet.getBoundingClientRect();
		const scale = r.width / WIDTH;
		const tops: Partial<Record<Key, number>> = {};
		const lines: (typeof placed)['lines'] = [];
		for (const side of ['left', 'right']) {
			let want = 0;
			const items = visible.filter((c) => c.side === side).map(({ key }) => {
				const el = callouts[key]!;
				const mid = (el.firstElementChild as HTMLElement).offsetHeight / 2;
				const a = anchor(key, layout!);
				if (a) want = key === 'photo' && layout!.photoCalloutY !== undefined ? layout!.photoCalloutY * scale : a[1] * scale - mid;
				return { key, el, mid, a, h: el.offsetHeight, y: want };
			}).sort((a, b) => sortY(a.key, a.a) - sortY(b.key, b.a));
			if (items.reduce((sum, item) => sum + item.h + CALLOUT_GAP, -CALLOUT_GAP) > r.height) {
				failed = { width: stageWidth, design };
				narrow = true;
				return void (placed = { tops: {}, lines: [] });
			}
			let floor = 0;
			for (const item of items) {
				item.y = Math.max(item.y, floor);
				floor = item.y + item.h + CALLOUT_GAP;
			}
			let ceiling = r.height;
			for (const item of items.reverse()) {
				item.y = Math.max(0, Math.min(item.y, ceiling - item.h));
				ceiling = item.y - CALLOUT_GAP;
			}
			for (const { key, el, mid, a, y } of items) {
				tops[key] = y;
				if (!a) continue;
				const box = el.parentElement!.getBoundingClientRect();
				const x1 = (side === 'left' ? box.right : box.left) - s.left;
				const y1 = box.top - s.top + y + mid;
				const x2 = r.left - s.left + a[0] * scale;
				// A colour callout with a clear stretch of background meets it level
				const span = key === 'colour' ? layout.fieldSpan : undefined;
				const y2 = span ? clamp(y1, r.top - s.top + span[0] * scale, r.top - s.top + span[1] * scale) : r.top - s.top + a[1] * scale;
				// Level out of the label, then bend halfway across the gap toward the element
				const bend = (x1 + (side === 'left' ? r.left : r.right) - s.left) / 2;
				lines.push({
					key,
					points: `${x1},${y1} ${bend},${y1} ${x2},${y2}`,
					x: x2,
					y: y2,
					empty: !!layout.text[key as TextKey]?.empty
				});
			}
		}
		placed = { tops, lines };
	}

	$effect(() => {
		void [layout, active, visible, sheetWidth, stageWidth, stageHeight, narrow, qrTile, uploads, error, frame];
		void tick().then(() => requestAnimationFrame(place));
	});

	const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
	const inside = (b: Box, x: number, y: number, pad = 10) =>
		x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
	let drag: { x: number; y: number; moved: boolean } | undefined;
	// Fingers down on the canvas; two of them pinch the photo
	const pointers = new Map<number, { x: number; y: number }>();
	let pinch: { d: number; x: number; y: number } | undefined;

	const spread = () => {
		const [a, b] = [...pointers.values()];
		return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
	};

	// Moves the photo with the pointer, by screen pixels
	function panBy(dx: number, dy: number) {
		if (!photo || !photoBox) return;
		const { w, h, scale } = photoCrop(photo, shot.zoom, photoBox.w, photoBox.h);
		const toPhoto = WIDTH / canvas!.getBoundingClientRect().width / scale;
		if (photo.width > w) shot.panX = clamp(shot.panX - (dx * toPhoto) / (photo.width - w), 0, 1);
		if (photo.height > h) shot.panY = clamp(shot.panY - (dy * toPhoto) / (photo.height - h), 0, 1);
	}

	// The photo under a point: a strip frame's index, 0 for the one photo elsewhere, or -1 for none
	function frameAt(x: number, y: number) {
		if (!layout) return -1;
		if (layout.frames) return layout.frames.findIndex((b) => inside(b, x, y, 0));
		return inside(layout.photo, x, y, 0) ? 0 : -1;
	}

	function flierPoint(event: MouseEvent): [number, number] {
		const rect = canvas!.getBoundingClientRect();
		return [((event.clientX - rect.left) * WIDTH) / rect.width, ((event.clientY - rect.top) * HEIGHT) / rect.height];
	}

	// Text edits in place, the QR code and the field open their settings, the photo drags
	function pointerDown(event: PointerEvent) {
		if (!layout) return;
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pointers.size === 2 && photo) {
			pinch = spread();
			drag = undefined;
			canvas!.setPointerCapture(event.pointerId);
			return;
		}
		if (pointers.size > 1) return;
		const [x, y] = flierPoint(event);
		// Drawn text wins over the empty slots that overlap it
		const hits = (Object.keys(layout.text) as TextKey[]).filter((key) => inside(layout!.text[key]!, x, y));
		const hit = hits.find((key) => !layout!.text[key]!.empty) ?? hits[0];
		const at = frameAt(x, y);
		if (hit) {
			// Keeps focus on the editor that opens rather than the canvas
			if (isText(hit)) {
				event.preventDefault();
				openedByTouch = event.pointerType === 'touch';
				openEditor(hit);
			} else {
				active = hit;
			}
		} else if (inside(layout.qr, x, y, 0)) {
			active = 'qr';
		} else if (at >= 0 && images[shots[at].name]) {
			if (layout.frames) sel = at;
			drag = { x: event.clientX, y: event.clientY, moved: false };
			canvas!.setPointerCapture(event.pointerId);
		} else {
			active = 'colour';
		}
	}

	function pointerMove(event: PointerEvent) {
		if (!pointers.has(event.pointerId)) return;
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pinch && pointers.size === 2) {
			const next = spread();
			if (pinch.d > 0) shot.zoom = clamp(shot.zoom * (next.d / pinch.d), 1, 3);
			panBy(next.x - pinch.x, next.y - pinch.y);
			pinch = next;
			return;
		}
		if (!drag || !photo) return;
		if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return;
		panBy(event.clientX - drag.x, event.clientY - drag.y);
		drag = { x: event.clientX, y: event.clientY, moved: true };
	}

	// A tap that did not move opens the photo's settings
	function pointerUp(event: PointerEvent) {
		pointers.delete(event.pointerId);
		if (pinch) {
			if (pointers.size < 2) pinch = undefined;
			return;
		}
		if (drag && !drag.moved) active = 'photo';
		drag = undefined;
	}

	// A finger lifted anywhere: over an editor that opened under it, the canvas never hears
	$effect(() => {
		const lift = (event: PointerEvent) => {
			pointers.delete(event.pointerId);
			if (pointers.size < 2) pinch = undefined;
		};
		window.addEventListener('pointerup', lift);
		window.addEventListener('pointercancel', lift);
		return () => {
			window.removeEventListener('pointerup', lift);
			window.removeEventListener('pointercancel', lift);
		};
	});

	// The browser took over, scrolling the page
	function pointerCancel(event: PointerEvent) {
		pointers.delete(event.pointerId);
		if (pointers.size < 2) pinch = undefined;
		drag = undefined;
	}

	function wheelZoom(event: WheelEvent) {
		const at = frameAt(...flierPoint(event));
		if (at < 0 || !images[shots[at].name]) return;
		event.preventDefault();
		if (layout?.frames) sel = at;
		shots[at].zoom = clamp(shots[at].zoom * Math.exp(-event.deltaY * 0.002), 1, 3);
	}

	// An editor over the text, set in the same type so the flier reads the same while typing
	// How far down its line box CSS sets a line's baseline: half the leading, then the font's ascent
	const metrics = document.createElement('canvas').getContext('2d')!;
	function baselineDrop(box: TextBox) {
		metrics.font = `${box.weight} ${box.size}px ${box.family}`;
		const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = metrics.measureText('x');
		return (box.lineHeight - ascent - descent) / 2 + ascent;
	}

	function editorStyle(key: TextKey) {
		// An editor being torn down after a tap moved on can be asked again for text no longer laid out
		const box = layout?.text[key];
		if (!box) return 'display: none';
		// One line per line typed, even where the flier joins them up
		const lines = Math.max(box.baselines.length, fields[key].split('\n').length);
		const { lineHeight } = box;
		const top = (box.baselines[0] - baselineDrop(box)) * k;
		const left = box.span[0] * k;
		const width = box.span[1] * k;
		const height = box.wrap ? 0 : lineHeight * lines * k;
		// Phones zoom the page into text fields set under 16px, so the editor is built at least that
		// big and scaled back down to the flier. It turns and shrinks about the point the flier
		// turns the text, kept where it would sit unscaled.
		const f = Math.max(1, 16 / (box.size * k));
		const px = box.align === 'center' ? width / 2 : box.align === 'right' ? width : 0;
		const py = height / 2;
		return [
			`left: ${left + px - px * f}px`,
			`top: ${top + py - py * f}px`,
			`width: ${width * f}px`,
			...(box.wrap ? [] : [`height: ${height * f}px`]),
			`font: ${box.weight} ${box.size * k * f}px/${lineHeight * k * f}px ${box.family}`,
			`outline-width: ${f}px`,
			`outline-offset: ${2 * f}px`,
			`--ink: ${box.color}`,
			...(box.shadow ? [`text-shadow: 0 0 ${12 * k * f}px ${box.shadow}`] : []),
			`text-transform: ${box.upper ? 'uppercase' : 'none'}`,
			`text-align: ${box.align}`,
			`transform: rotate(${box.rotate}rad) scale(${1 / f})`,
			`transform-origin: ${px * f}px ${py * f}px`
		].join('; ');
	}

	// Corner handles size the photo through whichever control the layout has. Classic grows its
	// photo down from the top edge; the rest grow about their middle.
	const SIZERS: Partial<Record<Design, { get: () => number; set: (v: number) => void; min: number; max: number; fromTop?: boolean }>> = {
		classic: { get: () => photoHeight, set: (v) => (photoHeight = v), min: 420, max: 1100, fromTop: true },
		shapes: { get: () => shapeScale, set: (v) => (shapeScale = v), min: 0.5, max: 1 },
		multishape: { get: () => frameScale, set: setFrameScale, min: 0.5, max: 1 },
		bigdate: { get: () => shapeScale, set: (v) => (shapeScale = v), min: 0.5, max: 1 },
		bigsquare: { get: () => shapeScale, set: (v) => (shapeScale = v), min: 0.5, max: 1 },
		polaroid: { get: () => printScale, set: (v) => (printScale = v), min: 0.6, max: 1 }
	};
	const sizer = $derived(SIZERS[design]);
	let resize: { reach: (p: [number, number]) => number; from: number; start: number } | undefined;

	function startResize(event: PointerEvent) {
		if (!layout || !sizer) return;
		event.stopPropagation();
		const box = photoBox ?? layout.photo;
		const [cx, cy] = [box.x + box.w / 2, box.y + box.h / 2];
		const reach = sizer.fromTop ? ([, y]: [number, number]) => y - box.y : ([x, y]: [number, number]) => Math.hypot(x - cx, y - cy);
		resize = { reach, from: Math.max(1, reach(flierPoint(event))), start: sizer.get() };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function moveResize(event: PointerEvent) {
		if (!resize || !sizer) return;
		sizer.set(clamp(resize.start * (resize.reach(flierPoint(event)) / resize.from), sizer.min, sizer.max));
	}

	function ring(box: Box) {
		return `left: ${box.x * k}px; top: ${box.y * k}px; width: ${box.w * k}px; height: ${box.h * k}px`;
	}

	// On phones a tap ends with stand-in mouse events that move focus to wherever the finger was,
	// closing an editor that opened elsewhere. Cancelling the tap's end stops them, and focusing
	// there, inside the touch, is also what lets the keyboard come up.
	let openedByTouch = false;
	let editorEl = $state<HTMLTextAreaElement>();
	const editing = $derived(isText(active) && layout?.text[active] ? active : null);

	function touchEnd(event: TouchEvent) {
		if (!openedByTouch) return;
		openedByTouch = false;
		event.preventDefault();
		editorEl?.focus({ preventScroll: true });
	}

	// Focused right away, inside the tap, which phones need before they show a keyboard;
	// the caret goes to the end once the editor has the new text
	function openEditor(key: TextKey) {
		active = key;
		editorEl?.focus({ preventScroll: true });
		void tick().then(() => editorEl?.setSelectionRange(editorEl.value.length, editorEl.value.length));
	}

	// As many rows as its text wraps to; rows, not a height, since the style attribute is redrawn
	function autoGrow(el: HTMLTextAreaElement) {
		const fit = () => {
			if (!editing || !layout?.text[editing]?.wrap) return void (el.rows = 1);
			el.rows = 1;
			el.rows = Math.max(1, Math.round(el.scrollHeight / parseFloat(getComputedStyle(el).lineHeight)));
		};
		const later = () => requestAnimationFrame(fit);
		el.addEventListener('input', later);
		el.addEventListener('focus', later);
		return () => {
			el.removeEventListener('input', later);
			el.removeEventListener('focus', later);
		};
	}

	function closeEditor(key: TextKey) {
		if (active === key) active = null;
	}

	// The finished flier as a PNG, with any editor closed so every line is drawn
	async function flierPng(): Promise<File | undefined> {
		active = null;
		await tick();
		const blob = await new Promise<Blob | null>((resolve) => (canvas ? canvas.toBlob(resolve, 'image/png') : resolve(null)));
		return blob ? new File([blob], flierFilename(fields), { type: 'image/png' }) : undefined;
	}

	async function download() {
		const file = await flierPng();
		if (!file) return;
		const a = document.createElement('a');
		a.href = URL.createObjectURL(file);
		a.download = file.name;
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	}

	// Phones can hand the image straight to their share sheet; browsers that cannot share files get no button
	const canShare = (() => {
		try {
			return !!navigator.canShare?.({ files: [new File([''], 'flier.png', { type: 'image/png' })] });
		} catch {
			return false;
		}
	})();

	async function share() {
		const file = await flierPng();
		if (!file) return;
		try {
			await navigator.share({ files: [file], title: 'Stringy and the Beans' });
		} catch (err) {
			// Closing the share sheet is not a failure
			if ((err as Error).name !== 'AbortError') fault = `Sharing failed: ${describe(err)}`;
		}
	}

	// Phones can keep the generator as its own app; iOS has no prompt, so it gets the steps instead
	type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
	const phone = matchMedia('(pointer: coarse)').matches;
	const installed = matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && !!navigator.standalone);
	const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
	let installPrompt = $state<InstallPrompt | null>(null);
	let iosSteps = $state(false);
	const canInstall = $derived(phone && !installed && (ios || !!installPrompt));

	$effect(() => {
		const onPrompt = (event: Event) => {
			event.preventDefault();
			installPrompt = event as InstallPrompt;
		};
		const onInstalled = () => (installPrompt = null);
		window.addEventListener('beforeinstallprompt', onPrompt);
		window.addEventListener('appinstalled', onInstalled);
		return () => {
			window.removeEventListener('beforeinstallprompt', onPrompt);
			window.removeEventListener('appinstalled', onInstalled);
		};
	});

	async function install() {
		if (!installPrompt) {
			iosSteps = !iosSteps;
			return;
		}
		await installPrompt.prompt();
		// A prompt can only be shown once
		if ((await installPrompt.userChoice).outcome === 'accepted') installPrompt = null;
	}
</script>

<svelte:head>
	<title>Flier generator - Stringy and the Beans</title>
	<meta name="robots" content="noindex" />
	<link rel="manifest" href="/flier.webmanifest" />
	<link rel="apple-touch-icon" href="/icons/flier-180.png" />
	<meta name="apple-mobile-web-app-title" content="Fliers" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="theme-color" content="#282828" />
</svelte:head>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (active = null)} onpointerdown={deselect} />

{#snippet panel(key: Key)}
	{#if key === 'photo'}
		{#if design === 'strip'}
			<div class="shape-group">
				<span class="group-label">Photos</span>
				<div class="tiles" role="radiogroup" aria-label="Photos in the strip">
					{#each [3, 4, 5] as n (n)}
						<label class="tile">
							<input type="radio" autocomplete="off" name="strip-count" value={n} bind:group={stripCount} />
							<span>{n}</span>
						</label>
					{/each}
				</div>
			</div>
		{/if}
		{#if frameCount > 1}
			<div class="shape-group">
				<span class="group-label">Frame</span>
				<div class="tiles" role="radiogroup" aria-label="Frame to edit">
					{#each { length: frameCount }, i (i)}
						<label class="tile">
							<input type="radio" autocomplete="off" name="strip-frame" value={i} bind:group={sel} />
							<span>{i + 1}</span>
						</label>
					{/each}
				</div>
			</div>
		{/if}
		<label>
			Photo
			<select autocomplete="off" bind:value={shots[frame].name}>
				{#each uploads as url, i (url)}<option value={url}>Uploaded photo {i + 1}</option>{/each}
				{#each photoGroups as group (group.label)}
					<optgroup label={group.label}>
						{#each group.photos as p (p.name)}
							<option value={p.name}>{p.caption} ({p.name})</option>
						{/each}
					</optgroup>
				{/each}
			</select>
		</label>
		<div class="buttons">
			<button class="shop-button secondary" type="button" onclick={pickRandom}>Random</button>
			<label class="shop-button secondary upload">Upload<input type="file" accept="image/*" onchange={pickUpload} /></label>
		</div>
		<label class="check"><input type="checkbox" autocomplete="off" bind:checked={grade} /> Gruvbox colour grade</label>
		{#if design === 'shapes' || design === 'multishape' || LAYOUT_SHAPES[design]}
			{#each [{ label: 'Portrait', round: false }, { label: 'Square', round: true }].filter((g) => SHAPES.some((c) => !!c.round === g.round && (LAYOUT_SHAPES[design]?.includes(c.name) ?? true))) as group (group.label)}
				<div class="shape-group">
					<span class="group-label">{group.label}</span>
					<div class="shapes" role="radiogroup" aria-label={`${group.label} shapes`}>
						{#each SHAPES.filter((c) => !!c.round === group.round) as c (c.name)}
							<label class="shape" title={c.label}>
								<input
									type="radio"
									autocomplete="off"
									name="photo-shape"
									value={c.name}
									checked={frameShape === c.name}
									onchange={() => setFrameShape(c.name)}
									aria-label={c.label}
								/>
								<span>
									<svg viewBox={c.round ? '0 0 24 24' : '0 0 24 30'} aria-hidden="true"><path d={SHAPE_ICONS[c.name]} /></svg>
								</span>
							</label>
						{/each}
					</div>
				</div>
			{/each}
			<label>Size <input type="range" autocomplete="off" min="0.5" max="1" step="0.01" bind:value={() => frameScale, setFrameScale} /></label>
		{/if}
		{#if design === 'polaroid'}
			<label>Height <input type="range" autocomplete="off" min="0.6" max="1" step="0.01" bind:value={printScale} /></label>
		{/if}
		{#if design === 'classic'}
			<label>Height <input type="range" autocomplete="off" min="420" max="1100" step="10" bind:value={photoHeight} /></label>
		{/if}
		<label>Zoom <input type="range" autocomplete="off" min="1" max="3" step="0.01" bind:value={shots[frame].zoom} /></label>
		<label>Left to right <input type="range" autocomplete="off" min="0" max="1" step="0.01" bind:value={shots[frame].panX} /></label>
		<label>Top to bottom <input type="range" autocomplete="off" min="0" max="1" step="0.01" bind:value={shots[frame].panY} /></label>
		{#if error}<p class="error" role="alert">{error}</p>{/if}
	{:else if key === 'colour'}
		{#each [{ label: 'Light', light: true }, { label: 'Dark', light: false }] as group (group.label)}
			<div class="shape-group">
				<span class="group-label">{group.label}</span>
				<div class="swatches" role="radiogroup" aria-label={`${group.label} colours`}>
					{#each PALETTES.filter((p) => isLight(p) === group.light) as p (p.name)}
						<label class="swatch" title={p.name} style={`--bg: ${p.bg}; --fg: ${p.accent}`}>
							<input type="radio" autocomplete="off" name="palette" value={p.name} bind:group={paletteName} aria-label={p.name} />
							<span>Aa</span>
						</label>
					{/each}
				</div>
			</div>
		{/each}
	{:else if key === 'qr'}
		<label>Link <input type="url" bind:value={fields.link} placeholder="Empty for no QR code" /></label>
		{#if fields.link.trim()}
			<dl class="tags" aria-label="Tags added to the link">
				{#each Object.entries(qrTags(fields)) as [key, value] (key)}
					<dt>{key}</dt>
					<dd>{value}</dd>
				{/each}
			</dl>
		{/if}
		<!-- The polaroid's sticker is always cream, and a tile on a background its own colour changes nothing -->
		{#if design !== 'polaroid' && !tileless}
			<div class="tiles" role="radiogroup" aria-label="QR background">
				{#each QR_TILES as t (t.name)}
					<label class="tile">
						<input type="radio" autocomplete="off" name="qr-tile" value={t.name} bind:group={qrTile} />
						<span>{t.name}</span>
					</label>
				{/each}
			</div>
			{#if qrTile === 'None'}<p class="hint">Check it scans on the bare field before printing.</p>{/if}
		{/if}
	{/if}
{/snippet}

{#snippet thumb(name: Design)}
	<svg viewBox="0 0 36 45" aria-hidden="true">
		{#if name === 'classic'}
			<rect x="0" y="0" width="36" height="22" class="photo" />
			<rect x="7" y="16" width="22" height="10" rx="3" class="logo" />
			<rect x="4" y="31" width="16" height="3" /><rect x="4" y="36" width="11" height="2" /><rect x="4" y="40" width="14" height="2" />
			<rect x="26" y="33" width="7" height="7" rx="1" />
		{:else if name === 'polaroid'}
			<rect x="10" y="3" width="16" height="8" rx="2" class="logo" />
			<g transform="rotate(-4 18 22)"><rect x="7" y="12" width="22" height="21" class="print" /><rect x="9" y="14" width="18" height="14" class="photo" /></g>
			<rect x="4" y="37" width="13" height="3" /><rect x="24" y="37" width="8" height="2" /><rect x="22" y="41" width="10" height="2" />
		{:else if name === 'bigdate'}
			<rect x="3" y="3" width="10" height="5" rx="2" class="logo" />
			<rect x="3" y="12" width="9" height="13" /><rect x="3" y="27" width="6" height="2" />
			<path d="M15 34V12a9 9 0 0 1 18 0v22z" class="photo" />
			<rect x="3" y="38" width="14" height="3" /><rect x="27" y="37" width="6" height="6" rx="1" />
		{:else if name === 'bigsquare'}
			<rect x="3" y="3" width="10" height="5" rx="2" class="logo" />
			<rect x="22" y="4" width="11" height="10" /><rect x="27" y="16" width="6" height="2" />
			<rect x="3" y="13" width="18" height="18" rx="1" class="photo" />
			<rect x="24" y="22" width="9" height="9" rx="1" />
			<rect x="3" y="36" width="18" height="3" /><rect x="3" y="41" width="12" height="2" />
		{:else if name === 'ticket'}
			<rect x="3" y="1" width="30" height="43" rx="2" class="print" />
			<rect x="11" y="3" width="14" height="7" rx="2" class="logo" />
			<rect x="5" y="12" width="26" height="10" rx="1" class="photo" />
			<line x1="5" y1="31" x2="31" y2="31" stroke-dasharray="2 1.5" />
			<rect x="5" y="35" width="12" height="2" /><rect x="5" y="39" width="9" height="2" /><rect x="25" y="34" width="6" height="6" rx="1" />
		{:else if name === 'cassette'}
			<rect x="3" y="1" width="30" height="43" rx="1" class="print" />
			<line x1="8" y1="3" x2="8" y2="42" stroke-dasharray="2 1.5" />
			<rect x="5" y="14" width="1.5" height="17" />
			<rect x="11" y="4" width="10" height="5" rx="2" class="logo" /><rect x="23" y="5" width="8" height="2" />
			<rect x="11" y="12" width="20" height="16" rx="1" class="photo" />
			<rect x="11" y="32" width="10" height="2" /><rect x="11" y="36" width="8" height="2" /><rect x="11" y="40" width="9" height="2" />
			<rect x="24" y="33" width="7" height="7" rx="1" />
		{:else if name === 'strip'}
			<rect x="2" y="1" width="12" height="43" class="print" />
			{#each [3, 12, 21, 30] as y (y)}<rect x="4" {y} width="8" height="8" class="photo" />{/each}
			<rect x="18" y="3" width="15" height="7" rx="2" class="logo" />
			<rect x="18" y="14" width="14" height="3" /><rect x="18" y="19" width="10" height="2" /><rect x="18" y="23" width="12" height="3" />
			<rect x="26" y="36" width="7" height="7" rx="1" />
		{:else if name === 'multishape'}
			<path d="M3 23V11a7 7 0 0 1 14 0v12z" class="photo" />
			<circle cx="26" cy="35" r="7" class="photo" />
			<rect x="20" y="4" width="13" height="6" rx="2" class="logo" />
			<rect x="22" y="13" width="11" height="3" /><rect x="26" y="18" width="7" height="2" />
			<rect x="3" y="28" width="13" height="3" /><rect x="3" y="33" width="9" height="2" /><rect x="3" y="38" width="6" height="5" rx="1" />
		{:else}
			<path d="M10 26V12a8 8 0 0 1 16 0v14z" class="photo" />
			<rect x="9" y="22" width="18" height="8" rx="3" class="logo" />
			<rect x="10" y="33" width="16" height="3" /><rect x="12" y="38" width="12" height="2" />
		{/if}
	</svg>
{/snippet}

{#snippet showPicker()}
	<select autocomplete="off" class="show" bind:value={showId} onchange={pickShow} aria-label="Show">
		{#each groups as group (group.label)}
			<optgroup label={group.label}>
				{#each group.shows as show (show.uid)}
					<option value={show.uid}>{show.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - {show.summary}</option>
				{/each}
			</optgroup>
		{/each}
	</select>
{/snippet}

{#snippet actionButtons()}
	<div class="actions">
		<button class="icon-button" type="button" onclick={randomize} aria-label="Randomize" title="Randomize">
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="1.8" />
				{#each [[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]] as [cx, cy] (`${cx},${cy}`)}
					<circle {cx} {cy} r="1.6" fill="currentColor" />
				{/each}
			</svg>
		</button>
		{#if canShare}
			<button class="icon-button primary" type="button" onclick={share} aria-label="Share" title="Share"><IconShare /></button>
		{/if}
		<button class="icon-button primary" type="button" onclick={download} aria-label="Download PNG" title="Download PNG"><IconDownload /></button>
		{#if canInstall}
			<button class="icon-button" type="button" onclick={install} aria-label="Install app" title="Install app" aria-expanded={ios ? iosSteps : undefined}><IconInstall /></button>
		{/if}
	</div>
{/snippet}

{#snippet layoutPicker()}
	<div class="layouts" role="radiogroup" aria-label="Layout">
		{#each DESIGNS as d, i (d.name)}
			<label class="layout" class:group-start={i > 0 && DESIGNS[i - 1].group !== d.group} title={d.label}>
				<input type="radio" autocomplete="off" name="layout" value={d.name} bind:group={design} aria-label={d.label} />
				<span>{@render thumb(d.name)}</span>
			</label>
		{/each}
	</div>
{/snippet}

<main class="flier shop-page" tabindex="-1">
	<h1 class="visually-hidden">Flier generator</h1>


	<!-- One bar over the flier: show, layout and actions in a row, or stacked on phones -->
	<div class="toolbar" class:narrow>
		{@render showPicker()}
		{@render layoutPicker()}
		{@render actionButtons()}
	</div>
	{#if iosSteps}
		<p class="hint">To install, tap Share, then Add to Home Screen.</p>
	{/if}

	<div class="stage" class:narrow bind:this={stage} {@attach watchSize((w, h) => ([stageWidth, stageHeight] = [w, h]))}>
		{#each narrow ? [] : ['left', 'right'] as side (side)}
			<div class="gutter {side}">
				{#each visible.filter((c) => c.side === side) as c (c.key)}
					<div
						class="callout"
						class:active={active === c.key}
						class:empty={!!layout?.text[c.key as TextKey]?.empty}
						bind:this={callouts[c.key]}
						style={`top: ${placed.tops[c.key] ?? 0}px`}
					>
						<button type="button" class="label" onclick={() => openCallout(c.key)} aria-expanded={isText(c.key) ? undefined : active === c.key}>
							{c.label}
						</button>
						{#if !isText(c.key)}
							<div class="panel">{@render panel(c.key)}</div>
						{/if}
					</div>
				{/each}
			</div>
		{/each}

		<div class="sheet" bind:this={sheet} {@attach watchSize((w) => (sheetWidth = w))}>
			<canvas
				bind:this={canvas}
				width={WIDTH}
				height={HEIGHT}
				aria-label="Flier preview"
				onpointerdown={pointerDown}
				onpointermove={pointerMove}
				onpointerup={pointerUp}
				onpointercancel={pointerCancel}
				ontouchend={touchEnd}
				onwheel={wheelZoom}
			></canvas>
			{#if layout && (active === 'photo' || active === 'qr')}
				<div class="ring" style={ring(active === 'photo' ? (photoBox ?? layout.photo) : layout.qr)}>
					{#if active === 'photo' && sizer}
						{#each sizer.fromTop ? ['sw', 'se'] : ['nw', 'ne', 'sw', 'se'] as corner (corner)}
							<span
								class="handle {corner}"
								role="slider"
								aria-label="Resize photo"
								aria-valuenow={sizer.get()}
								tabindex="-1"
								onpointerdown={startResize}
								onpointermove={moveResize}
								onpointerup={() => (resize = undefined)}
								onpointercancel={() => (resize = undefined)}
							></span>
						{/each}
					{/if}
				</div>
			{/if}
			<!-- One editor serves every text and stays on the page, moving to what was tapped: swapping
			     editors mid-tap lost focus on phones, and the keyboard with it -->
			<textarea
				class="editor"
				class:idle={!editing}
				style={editing ? editorStyle(editing) : ''}
				value={editing ? fields[editing] : ''}
				placeholder={editing ? PLACEHOLDERS[editing] : ''}
				aria-label={editing ? CALLOUTS.find((c) => c.key === editing)?.label : 'Text editor'}
				aria-hidden={!editing}
				tabindex={editing ? 0 : -1}
				wrap={editing === 'address' || layout?.text[editing ?? 'venue']?.wrap ? 'soft' : 'off'}
				spellcheck="false"
				bind:this={editorEl}
				oninput={(e) => editing && (fields[editing] = e.currentTarget.value)}
				onblur={() => editing && closeEditor(editing)}
				{@attach autoGrow}
			></textarea>
		</div>

		{#if !narrow}
		<svg class="leaders" aria-hidden="true">
			{#each placed.lines as l (l.key)}
				<g class:active={active === l.key} class:empty={l.empty}>
					<polyline class="halo" points={l.points} />
					<polyline points={l.points} />
					<circle cx={l.x} cy={l.y} r="3.5" />
				</g>
			{/each}
		</svg>
		{/if}
	</div>



	<!-- Phones skip the callouts: text is tapped on the flier, the rest is laid out here -->
	{#if narrow}
		<p class="hint">Tap any text on the flier to edit it.</p>
		{#each ['photo', 'colour', 'qr'] as const as key (key)}
			<section class="panel below" class:active={active === key}>
				<h2>{CALLOUTS.find((c) => c.key === key)?.label}</h2>
				{@render panel(key)}
			</section>
		{/each}
	{/if}
	{#if fault}
		<p class="fault" role="alert">
			<span>{fault}</span>
			<button type="button" onclick={() => (fault = '')}>Dismiss</button>
		</p>
	{/if}
</main>

<style>
	/* A dark page under light menus, so the flier is judged against dark surroundings */
	:global(html:has(main.flier)) {
		background-color: var(--gb-fg0);
	}

	.flier {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 1.5rem 1rem 3rem;
		/* A step darker than the site's, for the menus against the dark page */
		--color-text: var(--gb-fg0);
		--color-text-muted: var(--gb-fg1);
		--color-text-subtle: var(--gb-fg2);
		--color-text-faint: var(--gb-fg4);
	}

	.fault {
		position: fixed;
		left: 0.5rem;
		right: 0.5rem;
		bottom: 0.5rem;
		z-index: 10;
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin: 0;
		padding: 0.6rem 0.8rem;
		border-radius: 6px;
		background: var(--color-danger);
		color: var(--color-surface);
		font-size: 0.8rem;
		overflow-wrap: anywhere;
	}

	.fault span {
		flex: 1;
	}

	.fault button {
		padding: 0.3rem 0.6rem;
		border: 1px solid currentColor;
		border-radius: 4px;
		background: transparent;
		color: inherit;
		font: inherit;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
		max-width: 52rem;
	}

	.toolbar select.show {
		flex: 1 1 14rem;
		width: auto;
		min-width: 0;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	/* Phones give the show picker a row, the layouts and actions share the next when they fit */
	.toolbar.narrow select.show {
		flex-basis: 100%;
	}

	.toolbar.narrow .layouts {
		justify-content: center;
		gap: 0.6rem;
	}

	.toolbar.narrow .layout svg {
		width: 2.25rem;
		height: 2.8rem;
	}

	/* The phone bar's bigger icons set its height; the buttons and picker match them */
	.toolbar.narrow .icon-button {
		width: calc(2.8rem + 8px);
		height: calc(2.8rem + 8px);
	}

	.toolbar.narrow select {
		min-height: calc(2.8rem + 8px);
	}

	.layouts {
		display: flex;
		gap: 0.35rem;
	}

	.layout {
		position: relative;
		line-height: 0;
	}

	.layout.group-start {
		margin-left: 0.5rem;
	}

	.layout input {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}

	.layout span {
		display: block;
		padding: 3px;
		border: 1px solid var(--color-border);
		border-radius: 5px;
		background: var(--color-surface);
		color: var(--color-text-subtle);
	}

	/* 44px with its padding and border, level with the buttons and the show picker */
	.layout svg {
		display: block;
		width: 1.8rem;
		height: 2.25rem;
		fill: currentColor;
		stroke: currentColor;
		stroke-width: 0;
	}

	.layout svg line {
		stroke-width: 1;
	}

	.layout svg .photo {
		opacity: 0.35;
	}

	.layout svg .logo {
		fill: var(--gb-green-dim);
	}

	.layout svg .print {
		fill: none;
		stroke-width: 1;
	}

	.layout input:checked + span {
		border-color: var(--color-accent);
		color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent);
	}

	.layout input:focus-visible + span {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.icon-button {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-surface);
		color: var(--color-link);
		cursor: pointer;
	}

	.icon-button.primary {
		border-color: var(--color-accent);
		background: var(--color-accent);
		color: var(--color-surface);
	}

	.icon-button.primary:hover {
		background: var(--color-link-hover);
		border-color: var(--color-link-hover);
	}

	.icon-button:hover {
		border-color: var(--color-accent);
	}

	.icon-button svg {
		width: 1.4rem;
		height: 1.4rem;
	}


	.stage {
		--gutter: 13rem;
		position: relative;
		display: grid;
		/* As tall as the window allows, leaving room for the toolbar, so the page does not scroll */
		grid-template-columns: var(--gutter) minmax(0, min(44rem, calc((100dvh - 8rem) * 0.8))) var(--gutter);
		justify-content: center;
		gap: 3rem;
		width: 100%;
	}

	.gutter {
		position: relative;
		grid-row: 1;
	}

	.left {
		grid-column: 1;
	}

	.right {
		grid-column: 3;
	}

	.sheet {
		grid-row: 1;
		grid-column: 2;
	}

	.callout {
		position: absolute;
		left: 0;
		right: 0;
	}

	.callout.active {
		z-index: 2;
	}

	.left .callout {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.callout .label {
		max-width: 100%;
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-surface);
		color: var(--color-text-muted);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		white-space: nowrap;
		cursor: pointer;
	}

	.callout .label:hover {
		border-color: var(--color-accent);
		color: var(--color-link);
	}

	.callout.empty .label {
		border-style: dashed;
		color: var(--color-text-faint);
	}

	.callout.active .label {
		background: var(--color-accent);
		border-color: var(--color-accent);
		border-style: solid;
		color: var(--color-surface);
	}

	/* Open in the gutter under its chip */
	.panel {
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		width: 100%;
		margin-top: 0.4rem;
		padding: 0.6rem;
		border: 1px solid var(--color-border-subtle);
		border-radius: 6px;
		background: var(--color-surface);
		text-align: left;
	}

	.panel.below h2 {
		margin: 0;
		font-size: 0.75rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	.panel.below.active {
		border-color: var(--color-accent);
	}

	.panel.below {
		position: static;
		width: 100%;
		max-width: 34rem;
		margin-top: 0;
	}

	.flier:has(.stage:not(.narrow)) {
		padding-block: 1rem;
		gap: 1rem;
	}

	/* Stacked: the flier alone, its menus listed under it */
	.stage.narrow {
		grid-template-columns: minmax(0, 34rem);
	}

	.stage.narrow .sheet {
		grid-column: 1;
	}

	@media (max-width: 40rem) {
		.flier {
			padding-inline: 0.5rem;
		}
	}

	.panel label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.panel label.check {
		flex-direction: row;
		align-items: center;
		gap: 0.4rem;
	}

	.panel input[type='url'],
	.panel select,
	.toolbar select {
		box-sizing: border-box;
		width: 100%;
		padding: 0.45rem 0.55rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 400;
	}

	/* Dropdowns draw their own chevron in the page's muted ink, in place of the browser's */
	.panel select,
	.toolbar select {
		appearance: none;
		padding: 0.5rem 2.2rem 0.5rem 0.75rem;
		border-radius: 8px;
		background: var(--color-surface)
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%23665c54' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")
			no-repeat right 0.8rem center / 0.75rem;
		font-weight: 500;
		text-overflow: ellipsis;
		cursor: pointer;
		transition: border-color 120ms ease-out, box-shadow 120ms ease-out;
	}

	.panel select:hover,
	.toolbar select:hover {
		border-color: var(--color-accent);
	}

	.panel select:focus-visible,
	.toolbar select:focus-visible {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent);
	}

	/* Level with the 44px buttons beside it */
	.toolbar select {
		min-height: 2.75rem;
	}

	.panel input[type='file'] {
		max-width: 100%;
		font-size: 0.75rem;
	}

	.sheet {
		position: relative;
	}

	canvas {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 4px;
		box-shadow: 0 6px 24px rgba(40, 40, 40, 0.2);
		/* One finger scrolls the page up and down; sideways it drags the photo, two fingers pinch it */
		touch-action: pan-y;
		-webkit-tap-highlight-color: transparent;
		cursor: pointer;
	}

	.editor {
		position: absolute;
		box-sizing: border-box;
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 2px;
		outline: 1px dashed var(--ink);
		outline-offset: 2px;
		background: transparent;
		/* The flier leaves the text being typed undrawn; the editor shows it, set as close to the print as it can */
		color: var(--ink);
		caret-color: var(--ink);
		letter-spacing: 0;
		resize: none;
		overflow: hidden;
	}

	/* Parked off the flier while no text is being edited, still focusable for the next tap */
	.editor.idle {
		left: -9999px;
		top: 0;
		width: 10px;
		height: 10px;
		opacity: 0;
		pointer-events: none;
	}

	.editor::placeholder {
		color: var(--ink);
		opacity: 0.45;
	}

	.editor::selection {
		background: color-mix(in srgb, var(--ink) 30%, transparent);
	}

	.ring {
		position: absolute;
		box-sizing: border-box;
		border: 2px dashed var(--color-surface);
		border-radius: 4px;
		outline: 1px solid rgba(40, 40, 40, 0.35);
		pointer-events: none;
	}

	.handle {
		--size: 14px;
		position: absolute;
		width: var(--size);
		height: var(--size);
		margin: calc(var(--size) / -2);
		border: 2px solid var(--color-accent);
		border-radius: 3px;
		background: var(--color-surface);
		box-shadow: 0 1px 4px rgba(40, 40, 40, 0.35);
		pointer-events: auto;
		touch-action: none;
	}

	/* Bigger to land a finger on */
	@media (pointer: coarse) {
		.handle {
			--size: 26px;
		}
	}

	.handle.nw {
		top: 0;
		left: 0;
		cursor: nwse-resize;
	}

	.handle.ne {
		top: 0;
		left: 100%;
		cursor: nesw-resize;
	}

	.handle.sw {
		top: 100%;
		left: 0;
		cursor: nesw-resize;
	}

	.handle.se {
		top: 100%;
		left: 100%;
		cursor: nwse-resize;
	}

	.leaders {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
		pointer-events: none;
	}

	/* Light lines with a dark halo, read on the dark page and over the flier alike */
	.leaders polyline {
		fill: none;
		stroke-linejoin: round;
		stroke: var(--gb-bg2);
		stroke-width: 1;
	}

	.leaders polyline.halo {
		stroke: var(--gb-fg0);
		stroke-width: 3;
		stroke-opacity: 0.7;
	}

	.leaders circle {
		fill: var(--gb-bg2);
		stroke: var(--gb-fg0);
		stroke-width: 1.5;
	}

	.leaders .empty polyline:not(.halo) {
		stroke-dasharray: 3 3;
	}

	.leaders .empty circle {
		fill: var(--gb-fg0);
		stroke: var(--gb-bg2);
	}

	.leaders .active polyline:not(.halo) {
		stroke: #83a598;
		stroke-width: 1.5;
	}

	.leaders .active circle {
		fill: #83a598;
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	/* Twelve a group, four across */
	.panel .shape-group .swatches {
		display: grid;
		grid-template-columns: repeat(4, max-content);
	}

	.swatch {
		position: relative;
	}

	.swatch input,
	.tile input {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}

	.swatch span {
		display: grid;
		place-items: center;
		width: 2.1rem;
		height: 2.1rem;
		border: 2px solid var(--color-border);
		border-radius: 50%;
		background: var(--bg);
		color: var(--fg);
		font-size: 0.8rem;
		font-weight: 800;
	}

	.swatch input:checked + span {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent);
	}

	.tiles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.tile {
		position: relative;
	}

	.tile span {
		display: block;
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 0.8rem;
		font-weight: 500;
	}

	.tile input:checked + span {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: var(--color-surface);
	}

	.swatch input:focus-visible + span,
	.tile input:focus-visible + span {
		outline: 2px solid var(--color-accent);
		outline-offset: 3px;
	}

	.buttons {
		display: flex;
		gap: 0.4rem;
	}

	.buttons .shop-button {
		flex: 1;
		min-height: 2.25rem;
		padding-block: 0.35rem;
	}

	.upload input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	.upload:focus-within {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.shapes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.shape {
		position: relative;
		line-height: 0;
	}

	.shape input {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}

	.shape span {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2.2rem;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-bg);
		color: var(--color-text-subtle);
	}

	.shape svg {
		width: 1.1rem;
		height: 1.4rem;
		fill: currentColor;
	}

	.shape input:checked + span {
		border-color: var(--color-accent);
		background: var(--color-accent);
		color: var(--color-surface);
	}

	.shape input:focus-visible + span {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.group-label {
		display: block;
		margin-bottom: 0.3rem;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	.tags {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.15rem 0.5rem;
		margin: 0;
		font-size: 0.7rem;
		color: var(--color-text-subtle);
	}

	.tags dt {
		font-family: ui-monospace, monospace;
	}

	.tags dd {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text-muted);
	}

	.hint {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 0.75rem;
		font-weight: 400;
	}

	.flier > .hint {
		color: var(--gb-bg3);
	}

	.error {
		margin: 0;
		color: var(--color-danger);
		font-size: 0.8rem;
	}
</style>
