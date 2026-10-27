<script lang="ts">
	import { tick, untrack } from 'svelte';
	import IconDownload from '~icons/carbon/download';
	import logoArt from './lib/assets/logo.svg?raw';
	import beanArt from './lib/assets/bean-a.svg?raw';
	import lutUrl from './lib/assets/gruvbox-dark-hard-hald-12.png';
	import data from './lib/shows.json';
	import type { Show } from './lib/bandsintown';
	import { flierFields, flierFilename, isLight, palettesFor, PALETTES, qrTags, tintLogo, type LogoTint, QR_TILES, type FlierFields } from './lib/flier';
	import {
		applyLut,
		DESIGNS,
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
		type FlierLayout,
		type Lut,
		type TextKey
	} from './lib/flier-canvas';
	import { landscapePhotos, portraitPhotos } from './lib/photos';
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
	// Group shots only; the member folders hold solo portraits
	const photos = [...landscapePhotos, ...portraitPhotos].filter((p) => p.name.startsWith('band/'));
	const UPLOAD = 'upload';
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
		diamond: 'M12 1l10 14-10 14L2 15z',
		hexagon: 'M12 1l10 7v14l-10 7-10-7V8z',
		circle: 'M12 2a10 10 0 1 0 0.01 0z',
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
	let photoName = $state(photos[0].name);
	let uploadUrl = $state('');
	let design = $state<Design>('classic');
	let shape = $state<Shape>('arch');
	// Shapes start at full size, and can grow a little past it
	const SHAPE_MAX = 1.25;
	let shapeScale = $state(1);
	let printScale = $state(1);
	let photoHeight = $state(PHOTO_HEIGHT);
	let zoom = $state(1);
	let panX = $state(0.5);
	let panY = $state(0.4);
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
	let photo = $state.raw<HTMLImageElement>();
	// Photos recoloured with the Gruvbox LUT, graded once each
	let grade = $state(true);
	let lut = $state.raw<Lut>();
	let graded = $state.raw<{ from: HTMLImageElement; canvas: HTMLCanvasElement }>();
	const gradedCache = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
	// The plain photo stands in until its graded copy is ready
	const shown = $derived(grade && graded?.from === photo ? graded!.canvas : photo);
	let bean = $state.raw<HTMLImageElement>();
	// Each tint of the logo, drawn once; keyed by the tinted art so a retuned tint draws afresh
	const logos = new Map<string, Promise<HTMLImageElement>>();
	let logo = $state.raw<{ tint: LogoTint; img: HTMLImageElement }>();
	const art = $derived(bean && logo ? { bean, logo: logo.img } : undefined);
	let layout = $state.raw<FlierLayout>();
	let placed = $state.raw<{ tops: Partial<Record<Key, number>>; lines: { key: Key; points: string; x: number; y: number; empty: boolean }[] }>({
		tops: {},
		lines: []
	});
	let fontsReady = $state(false);
	let error = $state('');
	const callouts: Partial<Record<Key, HTMLElement>> = $state({});

	// Text labels sit on the side their text is aligned to; photo left, colour and QR code right
	const sideOf = (key: Key): 'left' | 'right' => {
		if (key === 'photo') return 'left';
		if (!isText(key)) return 'right';
		return layout?.text[key]?.align === 'right' ? 'right' : 'left';
	};
	const visible = $derived(CALLOUTS.map((c) => ({ ...c, side: sideOf(c.key) })));
	const palette = $derived(PALETTES.find((p) => p.name === paletteName) ?? PALETTES[0]);
	const tileBg = $derived(QR_TILES.find((t) => t.name === qrTile)?.bg ?? null);
	const photoSrc = $derived(photoName === UPLOAD ? uploadUrl : `/images/${photoName}.webp`);
	// Flier pixels to preview pixels
	const k = $derived(sheetWidth / WIDTH);

	function pickShow() {
		const show = choices.find((s) => s.uid === showId);
		if (show) fields = flierFields(show);
	}

	const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

	// Another band photo, loaded and graded before anything changes, so it swaps in whole
	let rolls = 0;
	async function nextPhoto() {
		const roll = ++rolls;
		const name = pick(photos.filter((p) => p.name !== photoName)).name;
		let img: HTMLImageElement | undefined;
		try {
			img = await loadImage(`/images/${name}.webp`);
			if (grade && lut && !gradedCache.has(img)) gradedCache.set(img, applyLut(img, lut));
		} catch {
			img = undefined;
		}
		return roll === rolls ? { name, img } : undefined;
	}

	// Framed afresh from its top, where the faces usually are
	function showPhoto({ name, img }: { name: string; img?: HTMLImageElement }) {
		photoName = name;
		if (img) photo = img;
		zoom = 1;
		panX = 0.5;
		panY = 0;
	}

	async function pickRandom() {
		const next = await nextPhoto();
		if (next) showPhoto(next);
	}

	// A fresh look: layout, photo and QR code, and a colour picked to suit the photo as it will
	// show after the grade; the text stays. All of it lands together once the photo is ready.
	async function randomize() {
		const next = await nextPhoto();
		if (!next) return;
		const others = PALETTES.filter((p) => p.name !== paletteName);
		const tone = next.img && photoTone(next.img);
		const ranked = tone ? palettesFor(grade && lut ? lutColor(tone, lut) : tone).filter((p) => p.name !== paletteName) : others;
		design = pick(DESIGNS.filter((d) => d.name !== design)).name;
		shape = pick(SHAPES).name;
		shapeScale = 1;
		qrTile = pick(QR_TILES.filter((t) => t.bg)).name;
		paletteName = pick(ranked.slice(0, 3)).name;
		showPhoto(next);
	}

	function pickUpload(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		if (uploadUrl) URL.revokeObjectURL(uploadUrl);
		uploadUrl = URL.createObjectURL(file);
		photoName = UPLOAD;
	}

	function openCallout(key: Key) {
		active = isText(key) || active !== key ? key : null;
	}

	$effect(() => {
		void svgImage(beanArt, 256).then((img) => (bean = img));
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

	$effect(() => {
		const src = photoSrc;
		if (!src) return;
		// Already in hand when a random pick loaded it ahead
		if (untrack(() => photo)?.src === new URL(src, location.href).href) return;
		let current = true;
		loadImage(src).then(
			(img) => current && ((photo = img), (error = '')),
			() => current && (error = 'That photo could not be loaded.')
		);
		return () => (current = false);
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
		if (!grade || lut) return;
		loadLut(lutUrl).then(
			(loaded) => (lut = loaded),
			() => (error = 'The colour grade could not be loaded.')
		);
	});

	$effect(() => {
		if (!grade || !lut || !photo) return;
		let canvas = gradedCache.get(photo);
		if (!canvas) gradedCache.set(photo, (canvas = applyLut(photo, lut)));
		graded = { from: photo, canvas };
	});

	$effect(() => {
		const ctx = canvas?.getContext('2d');
		if (!ctx || !art || !fontsReady) return;
		layout = drawFlier(
			ctx,
			$state.snapshot(fields),
			palette,
			{ tile: tileBg },
			{ ...art, design, shape, shapeScale, printScale, photo: shown, height: photoHeight, zoom, pan: [panX, panY] },
			isText(active) ? active : undefined
		);
	});

	// Where each leader line meets its element, in flier pixels
	function anchor(key: Key, l: FlierLayout): [number, number] | undefined {
		if (key === 'photo') return [l.photo.x + 28, l.photo.y + l.photo.h * 0.3];
		if (key === 'colour') return l.field;
		if (key === 'qr') return [l.qr.x + l.qr.w + 14, l.qr.y + l.qr.h / 2];
		const box = l.text[key];
		if (!box) return;
		if (box.anchor && sideOf(key) === 'left') return box.anchor;
		if (box.align === 'right') return [box.x + box.w + 14, box.baselines[0] - box.size * 0.3];
		// A right hand label meets left aligned text where it ends
		return sideOf(key) === 'right' ? [box.end + 14, box.y + box.h / 2] : [box.x - 14, box.y + box.h / 2];
	}

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
				if (a) want = a[1] * scale - mid;
				return { key, el, mid, a, h: el.offsetHeight, y: want };
			}).sort((a, b) => (a.a?.[1] ?? 0) - (b.a?.[1] ?? 0));
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
				const y2 = r.top - s.top + a[1] * scale;
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
		void [layout, active, visible, sheetWidth, stageWidth, stageHeight, narrow, qrTile, uploadUrl, error];
		void tick().then(() => requestAnimationFrame(place));
	});

	const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
	const inside = (b: Box, x: number, y: number, pad = 10) =>
		x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
	let drag: { x: number; y: number; moved: boolean } | undefined;

	function flierPoint(event: MouseEvent): [number, number] {
		const rect = canvas!.getBoundingClientRect();
		return [((event.clientX - rect.left) * WIDTH) / rect.width, ((event.clientY - rect.top) * HEIGHT) / rect.height];
	}

	// Text edits in place, the QR code and the field open their settings, the photo drags
	function pointerDown(event: PointerEvent) {
		if (!layout) return;
		const [x, y] = flierPoint(event);
		// Drawn text wins over the empty slots that overlap it
		const hits = (Object.keys(layout.text) as TextKey[]).filter((key) => inside(layout!.text[key]!, x, y));
		const hit = hits.find((key) => !layout!.text[key]!.empty) ?? hits[0];
		if (hit) {
			// Keeps focus on the editor that opens rather than the canvas
			if (isText(hit)) event.preventDefault();
			active = hit;
		} else if (inside(layout.qr, x, y, 0)) {
			active = 'qr';
		} else if (inside(layout.photo, x, y, 0) && photo) {
			drag = { x: event.clientX, y: event.clientY, moved: false };
			canvas!.setPointerCapture(event.pointerId);
		} else {
			active = 'colour';
		}
	}

	function pointerMove(event: PointerEvent) {
		if (!drag || !photo) return;
		if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return;
		const { w, h, scale } = photoCrop(photo, zoom, layout!.photo.w, layout!.photo.h);
		const toPhoto = WIDTH / canvas!.getBoundingClientRect().width / scale;
		if (photo.width > w) panX = clamp(panX - ((event.clientX - drag.x) * toPhoto) / (photo.width - w), 0, 1);
		if (photo.height > h) panY = clamp(panY - ((event.clientY - drag.y) * toPhoto) / (photo.height - h), 0, 1);
		drag = { x: event.clientX, y: event.clientY, moved: true };
	}

	function pointerUp() {
		if (drag && !drag.moved) active = 'photo';
		drag = undefined;
	}

	function wheelZoom(event: WheelEvent) {
		if (!photo || !layout || !inside(layout.photo, ...flierPoint(event), 0)) return;
		event.preventDefault();
		zoom = clamp(zoom * Math.exp(-event.deltaY * 0.002), 1, 3);
	}

	// An editor over the text, set in the same type so the flier reads the same while typing
	function editorStyle(key: TextKey) {
		const box = layout!.text[key]!;
		// A joined up address still edits one line per line typed
		const lines = key === 'address' ? Math.max(box.baselines.length, fields.address.split('\n').length) : 1;
		const { lineHeight } = box;
		const top = box.baselines[0] - box.size * 0.36 - lineHeight / 2;
		const [left, width] = box.span;
		return [
			`left: ${left * k}px`,
			`top: ${top * k}px`,
			`width: ${width * k}px`,
			...(box.wrap ? [] : [`height: ${box.lineHeight * lines * k}px`]),
			`font: ${box.weight} ${box.size * k}px/${lineHeight * k}px ${box.family}`,
			`--ink: ${box.color}`,
			`text-transform: ${box.upper ? 'uppercase' : 'none'}`,
			`text-align: ${box.align}`,
			`transform: rotate(${box.rotate}rad)`,
			// Turned about the same point the flier turns it
			`transform-origin: ${box.align === 'center' ? 'center' : 'right'} center`
		].join('; ');
	}

	function ring(box: Box) {
		return `left: ${box.x * k}px; top: ${box.y * k}px; width: ${box.w * k}px; height: ${box.h * k}px`;
	}

	function focusEditor(el: HTMLInputElement | HTMLTextAreaElement) {
		el.focus();
		el.setSelectionRange(el.value.length, el.value.length);
	}

	// As many rows as its text wraps to; rows, not a height, since the style attribute is redrawn
	function autoGrow(el: HTMLTextAreaElement) {
		const fit = () => {
			el.rows = 1;
			el.rows = Math.max(1, Math.round(el.scrollHeight / parseFloat(getComputedStyle(el).lineHeight)));
		};
		const later = () => requestAnimationFrame(fit);
		later();
		el.addEventListener('input', later);
		return () => el.removeEventListener('input', later);
	}

	function closeEditor(key: TextKey) {
		if (active === key) active = null;
	}

	async function download() {
		active = null;
		await tick();
		canvas?.toBlob((blob) => {
			if (!blob) return;
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = flierFilename(fields);
			a.click();
			setTimeout(() => URL.revokeObjectURL(a.href), 1000);
		}, 'image/png');
	}
</script>

<svelte:head>
	<title>Flier generator - Stringy and the Beans</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (active = null)} />

{#snippet panel(key: Key)}
	{#if key === 'photo'}
		<label>
			Photo
			<select bind:value={photoName}>
				{#if uploadUrl}<option value={UPLOAD}>Uploaded photo</option>{/if}
				{#each photos as p (p.name)}
					<option value={p.name}>{p.caption} ({p.name})</option>
				{/each}
			</select>
		</label>
		<div class="buttons">
			<button class="shop-button secondary" type="button" onclick={pickRandom}>Random</button>
			<label class="shop-button secondary upload">Upload<input type="file" accept="image/*" onchange={pickUpload} /></label>
		</div>
		<label class="check"><input type="checkbox" bind:checked={grade} /> Gruvbox colour grade</label>
		{#if design === 'shapes' || design === 'bigdate'}
			{#each [{ label: 'Portrait', round: false }, { label: 'Square', round: true }] as group (group.label)}
				<div class="shape-group">
					<span class="group-label">{group.label}</span>
					<div class="shapes" role="radiogroup" aria-label={`${group.label} shapes`}>
						{#each SHAPES.filter((c) => !!c.round === group.round) as c (c.name)}
							<label class="shape" title={c.label}>
								<input type="radio" name="photo-shape" value={c.name} bind:group={shape} aria-label={c.label} />
								<span>
									<svg viewBox={c.round ? '0 0 24 24' : '0 0 24 30'} aria-hidden="true"><path d={SHAPE_ICONS[c.name]} /></svg>
								</span>
							</label>
						{/each}
					</div>
				</div>
			{/each}
			<label>Size <input type="range" min="0.6" max={SHAPE_MAX} step="0.01" bind:value={shapeScale} /></label>
		{/if}
		{#if design === 'polaroid'}
			<label>Height <input type="range" min="0.6" max="1" step="0.01" bind:value={printScale} /></label>
		{/if}
		{#if design === 'classic'}
			<label>Height <input type="range" min="420" max="1100" step="10" bind:value={photoHeight} /></label>
		{/if}
		<label>Zoom <input type="range" min="1" max="3" step="0.01" bind:value={zoom} /></label>
		<label>Left to right <input type="range" min="0" max="1" step="0.01" bind:value={panX} /></label>
		<label>Top to bottom <input type="range" min="0" max="1" step="0.01" bind:value={panY} /></label>
		{#if error}<p class="error" role="alert">{error}</p>{/if}
	{:else if key === 'colour'}
		{#each [{ label: 'Light', light: true }, { label: 'Dark', light: false }] as group (group.label)}
			<div class="shape-group">
				<span class="group-label">{group.label}</span>
				<div class="swatches" role="radiogroup" aria-label={`${group.label} colours`}>
					{#each PALETTES.filter((p) => isLight(p) === group.light) as p (p.name)}
						<label class="swatch" title={p.name} style={`--bg: ${p.bg}; --fg: ${p.accent}`}>
							<input type="radio" name="palette" value={p.name} bind:group={paletteName} aria-label={p.name} />
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
		<!-- The polaroid's sticker is always cream -->
		{#if design !== 'polaroid'}
			<div class="tiles" role="radiogroup" aria-label="QR background">
				{#each QR_TILES as t (t.name)}
					<label class="tile">
						<input type="radio" name="qr-tile" value={t.name} bind:group={qrTile} />
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
		{:else if name === 'ticket'}
			<rect x="3" y="1" width="30" height="43" rx="2" class="print" />
			<rect x="11" y="3" width="14" height="7" rx="2" class="logo" />
			<rect x="5" y="12" width="26" height="10" rx="1" class="photo" />
			<line x1="5" y1="31" x2="31" y2="31" stroke-dasharray="2 1.5" />
			<rect x="5" y="35" width="12" height="2" /><rect x="5" y="39" width="9" height="2" /><rect x="25" y="34" width="6" height="6" rx="1" />
		{:else}
			<path d="M10 26V12a8 8 0 0 1 16 0v14z" class="photo" />
			<rect x="9" y="22" width="18" height="8" rx="3" class="logo" />
			<rect x="10" y="33" width="16" height="3" /><rect x="12" y="38" width="12" height="2" />
		{/if}
	</svg>
{/snippet}

<main class="flier shop-page" tabindex="-1">
	<h1 class="visually-hidden">Flier generator</h1>


	<div class="stage" class:narrow bind:this={stage} bind:clientWidth={stageWidth} bind:clientHeight={stageHeight}>
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

		<div class="sheet" bind:this={sheet} bind:clientWidth={sheetWidth}>
			<canvas
				bind:this={canvas}
				width={WIDTH}
				height={HEIGHT}
				aria-label="Flier preview"
				onpointerdown={pointerDown}
				onpointermove={pointerMove}
				onpointerup={pointerUp}
				onpointercancel={() => (drag = undefined)}
				onwheel={wheelZoom}
			></canvas>
			{#if layout && (active === 'photo' || active === 'qr')}
				<div class="ring" style={ring(active === 'photo' ? layout.photo : layout.qr)}></div>
			{/if}
			{#if layout && isText(active) && layout.text[active]}
				{@const key = active}
				{#key key}
					{#if key === 'address'}
						<textarea
							class="editor"
							class:own={layout.text[key]?.own}
							style={editorStyle(key)}
							bind:value={fields.address}
							placeholder={PLACEHOLDERS.address}
							aria-label="Address"
							spellcheck="false"
							onblur={() => closeEditor(key)}
							{@attach focusEditor}
						></textarea>
					{:else if layout.text[key]!.wrap}
						<!-- Wraps like the drawn text; Enter still finishes rather than breaking the line -->
						<textarea
							class="editor"
							class:own={layout.text[key]?.own}
							style={editorStyle(key)}
							bind:value={fields[key]}
							placeholder={PLACEHOLDERS[key]}
							aria-label={CALLOUTS.find((c) => c.key === key)?.label}
							spellcheck="false"
							onblur={() => closeEditor(key)}
							onkeydown={(e) => {
								if (e.key !== 'Enter') return;
								e.preventDefault();
								closeEditor(key);
							}}
							{@attach focusEditor}
							{@attach autoGrow}
						></textarea>
					{:else}
						<input
							class="editor"
							class:own={layout.text[key]?.own}
							style={editorStyle(key)}
							bind:value={fields[key]}
							placeholder={PLACEHOLDERS[key]}
							aria-label={CALLOUTS.find((c) => c.key === key)?.label}
							spellcheck="false"
							onblur={() => closeEditor(key)}
							onkeydown={(e) => e.key === 'Enter' && closeEditor(key)}
							{@attach focusEditor}
						/>
					{/if}
				{/key}
			{/if}
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


	<div class="toolbar">
		<select class="show" bind:value={showId} onchange={pickShow} aria-label="Show">
			{#each groups as group (group.label)}
				<optgroup label={group.label}>
					{#each group.shows as show (show.uid)}
						<option value={show.uid}>{show.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - {show.summary}</option>
					{/each}
				</optgroup>
			{/each}
		</select>
		<div class="layouts" role="radiogroup" aria-label="Layout">
			{#each DESIGNS as d (d.name)}
				<label class="layout" title={d.label}>
					<input type="radio" name="layout" value={d.name} bind:group={design} aria-label={d.label} />
					<span>{@render thumb(d.name)}</span>
				</label>
			{/each}
		</div>
		<button class="icon-button" type="button" onclick={randomize} aria-label="Randomize" title="Randomize">
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="1.8" />
				{#each [[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]] as [cx, cy] (`${cx},${cy}`)}
					<circle {cx} {cy} r="1.6" fill="currentColor" />
				{/each}
			</svg>
		</button>
		<button class="shop-button" type="button" onclick={download}><IconDownload /> Download</button>
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
</main>

<style>
	.flier {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 1.5rem 1rem 3rem;
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
		max-width: 46rem;
	}

	.toolbar select.show {
		flex: 1 1 14rem;
		width: auto;
		min-width: 0;
	}

	.layouts {
		display: flex;
		gap: 0.35rem;
	}

	.layout {
		position: relative;
		line-height: 0;
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

	.layout svg {
		display: block;
		width: 1.6rem;
		height: 2rem;
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

	.icon-button:hover {
		border-color: var(--color-accent);
	}

	.icon-button svg {
		width: 1.4rem;
		height: 1.4rem;
	}

	.toolbar .shop-button {
		gap: 0.4rem;
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
		touch-action: none;
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
		/* The flier draws the text underneath as it will print; only the caret and selection show */
		color: transparent;
		caret-color: var(--ink);
		letter-spacing: 0;
		resize: none;
		overflow: hidden;
	}

	.editor.own {
		color: var(--ink);
	}

	.editor::placeholder {
		color: var(--ink);
		opacity: 0.45;
	}

	.editor::selection {
		color: transparent;
		background: color-mix(in srgb, var(--ink) 30%, transparent);
	}

	.editor.own::selection {
		color: var(--ink);
	}

	.ring {
		position: absolute;
		box-sizing: border-box;
		border: 2px dashed var(--color-surface);
		border-radius: 4px;
		outline: 1px solid rgba(40, 40, 40, 0.35);
		pointer-events: none;
	}

	.leaders {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
		pointer-events: none;
	}

	.leaders polyline {
		fill: none;
		stroke-linejoin: round;
		stroke: var(--color-text-subtle);
		stroke-width: 1;
	}

	.leaders polyline.halo {
		stroke: var(--color-surface);
		stroke-width: 3;
		stroke-opacity: 0.7;
	}

	.leaders circle {
		fill: var(--color-text-subtle);
		stroke: var(--color-surface);
		stroke-width: 1.5;
	}

	.leaders .empty polyline:not(.halo) {
		stroke-dasharray: 3 3;
	}

	.leaders .empty circle {
		fill: var(--color-surface);
		stroke: var(--color-text-subtle);
	}

	.leaders .active polyline:not(.halo) {
		stroke: var(--color-accent);
		stroke-width: 1.5;
	}

	.leaders .active circle {
		fill: var(--color-accent);
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
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

	.error {
		margin: 0;
		color: var(--color-danger);
		font-size: 0.8rem;
	}
</style>
