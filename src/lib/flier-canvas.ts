import qrcode from 'qrcode-generator';
import { contrast, isLight, ordinalSuffix, QR_TILES, qrColor, qrLink, shade, type FlierFields, type Palette, type QrStyle } from './flier';

// Instagram's native portrait size
export const WIDTH = 1080;
export const HEIGHT = 1350;

export const PAD = 64;
// Default photo band height in the classic layout; the logo overlaps its faded lower edge
export const PHOTO_HEIGHT = 720;
const LOGO_WIDTH = 920;
const LOGO_TOP = 330;
// A suffix's size against its line
const SUFFIX = 0.3;
// Where the big date column ends, whatever the shape beside it does
const DATE_BOTTOM = 924;
// The same column moved top right, for round shapes in the lower left
const DATE_TOP_BOTTOM = 530;
// Round shapes start under the logo
const ROUND_TOP = 318;
// and leave a column beside them for a QR code at least this big
const QR_MIN = 230;
// Air between a big date photo and the QR code that trades room with it
const QR_GAP = 56;
// The art leans left, so it sits a little right of centre to look centred
const LOGO_NUDGE = 24 / LOGO_WIDTH;
// The art's lower edge is mostly air, so it counts for less of its height
const LOGO_VISUAL = 0.93;
const TAGLINE_WIDTH = 640;
const TAGLINE_TILT = -0.06;
const QR_SIZE = 250;
const FONT = 'Epilogue, sans-serif';
const SCRIPT = '"Homemade Apple", cursive';
// Polaroid frame and its pen
const PRINT = '#fffdf5';
const PRINT_INK = '#3c3836';

export type Design = 'classic' | 'polaroid' | 'bigdate' | 'bigsquare' | 'ticket' | 'cassette' | 'strip' | 'shapes';

export const DESIGNS: { name: Design; label: string }[] = [
	{ name: 'classic', label: 'Classic' },
	{ name: 'polaroid', label: 'Polaroid' },
	{ name: 'bigdate', label: 'Big date' },
	{ name: 'bigsquare', label: 'Big date square' },
	{ name: 'ticket', label: 'Ticket' },
	{ name: 'cassette', label: 'Cassette' },
	{ name: 'strip', label: 'Photo strip' },
	{ name: 'shapes', label: 'Shapes' }
];

// Cut-outs for the photo in the shapes layout, each with the height it takes at full width
export type Shape = 'arch' | 'circle' | 'oval' | 'rounded' | 'hexagon' | 'flower' | 'burst' | 'square';

// `round` shapes keep a square box wherever they go
export const SHAPES: { name: Shape; label: string; height: number; round?: boolean }[] = [
	{ name: 'arch', label: 'Arch', height: 700 },
	{ name: 'oval', label: 'Oval', height: 700 },
	{ name: 'rounded', label: 'Rounded', height: 640 },
	{ name: 'hexagon', label: 'Hexagon', height: 660 },
	{ name: 'circle', label: 'Circle', height: 600, round: true },
	{ name: 'flower', label: 'Flower', height: 600, round: true },
	{ name: 'burst', label: 'Burst', height: 600, round: true },
	{ name: 'square', label: 'Square', height: 600, round: true }
];

// A shape at its largest is this much past its natural size
const SHAPE_GROW = 1.25;

// A photo and how it sits in its frame
export type Frame = {
	photo?: CanvasImageSource & { width: number; height: number };
	// 1 just covers the frame
	zoom: number;
	// Which part of the photo stays in frame, 0 to 1 across and down
	pan: [number, number];
};

export type FlierArt = Frame & {
	// The photo strip's frames, top to bottom
	frames: Frame[];
	design: Design;
	shape: Shape;
	// The shape's size, 1 its largest
	shapeScale: number;
	// The polaroid print's height against all the room it has
	printScale: number;
	// How far down the flier the photo reaches in the classic layout
	height: number;
	logo: HTMLImageElement;
	bean: HTMLImageElement;
	// The logo's little bean
	littleBean: HTMLImageElement;
};

export const FONTS = [`800 54px ${FONT}`, `500 30px ${FONT}`, `32px ${SCRIPT}`];

// An SVG as an image the canvas can draw; Firefox needs an explicit size on the root
export function svgImage(svg: string, width: number): Promise<HTMLImageElement> {
	const [, , , w, h] = svg.match(/viewBox="([^"]+)"/)![1].split(/\s+/).map(Number);
	const sized = svg.replace('<svg', `<svg width="${width}" height="${Math.round((width * h) / w)}"`);
	return loadImage(URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' })));
}

export function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Could not load ${src}`));
		img.src = src;
	});
}

export type TextKey = 'venue' | 'address' | 'time' | 'date' | 'entry' | 'tagline';

export type Box = { x: number; y: number; w: number; h: number };

type Align = 'left' | 'right' | 'center';

// Where a line of text was drawn, so it can be edited in place over the canvas
export type TextBox = Box & {
	baselines: number[];
	size: number;
	weight: number;
	family: string;
	color: string;
	upper: boolean;
	lineHeight: number;
	align: Align;
	rotate: number;
	// The editor's left edge and width, which may run wider than the text
	span: [number, number];
	// Nothing drawn: where the text would go once typed
	empty: boolean;
	// Where its callout line should meet it, when not the text's own edge
	anchor?: [number, number];
	// Where its callout falls in its column's top to bottom order, when not by its line
	sortY?: number;
	// The gutter its callout sits in, when not the side its text is aligned to
	side?: 'left' | 'right';
	// Where the drawn text ends on the right, which can fall well short of the box
	end: number;
	// One value broken over several lines, so it edits wrapping across them all
	wrap?: boolean;
	// Drawn too unlike its plain text to type over, so the editor shows its own text instead
	own?: boolean;
};

export type FlierLayout = {
	photo: Box;
	// The photo strip's frames, each dragged on its own in place of `photo`
	frames?: Box[];
	// `behind` is what shows round the code without a tile
	qr: Box & { behind: string };
	// A point of plain background, for the colour callout
	field: [number, number];
	// Plain background runs down this stretch of the field's x, so its line can meet it level with the callout
	fieldSpan?: [number, number];
	// Where the photo's callout line meets it, when not a third of the way down its left edge
	photoAnchor?: [number, number];
	// Where the photo's callout, menu and all, starts down its column, rather than level with the photo
	photoCalloutY?: number;
	text: Partial<Record<TextKey, TextBox>>;
};

// A Hald CLUT: a level L image holds an L*L sized colour cube, red fastest, then green, then blue
export type Lut = { data: Uint8ClampedArray; size: number };

// Graded photos are capped at this long side so grading stays quick
const GRADE_MAX = 2400;

export async function loadLut(src: string): Promise<Lut> {
	const img = await loadImage(src);
	const ctx = new OffscreenCanvas(img.naturalWidth, img.naturalHeight).getContext('2d')!;
	ctx.drawImage(img, 0, 0);
	const level = Math.round(Math.cbrt(img.naturalWidth));
	return { data: ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight).data, size: level * level };
}

// The photo recoloured through the LUT, blending the eight nearest cube entries
// A photo's leading colour as [r, g, b]: its pixels averaged, the colourful ones counting most
export function photoTone(photo: HTMLImageElement): [number, number, number] {
	const ctx = new OffscreenCanvas(32, 32).getContext('2d')!;
	ctx.drawImage(photo, 0, 0, 32, 32);
	const px = ctx.getImageData(0, 0, 32, 32).data;
	const sum = [0, 0, 0];
	let weight = 0;
	for (let i = 0; i < px.length; i += 4) {
		const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
		const w = 0.05 + (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
		sum[0] += r * w;
		sum[1] += g * w;
		sum[2] += b * w;
		weight += w;
	}
	return sum.map((c) => c / weight) as [number, number, number];
}

// One colour through the LUT, at its nearest cube entry
export function lutColor([r, g, b]: [number, number, number], { data, size }: Lut): [number, number, number] {
	const at = (c: number) => Math.round((c / 255) * (size - 1));
	const i = (at(r) + at(g) * size + at(b) * size * size) * 4;
	return [data[i], data[i + 1], data[i + 2]];
}

export function applyLut(photo: HTMLImageElement, { data, size }: Lut): HTMLCanvasElement {
	const scale = Math.min(1, GRADE_MAX / Math.max(photo.naturalWidth, photo.naturalHeight));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(photo.naturalWidth * scale);
	canvas.height = Math.round(photo.naturalHeight * scale);
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(photo, 0, 0, canvas.width, canvas.height);
	const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const px = image.data;
	const max = size - 1;
	const step = max / 255;
	const g1 = size;
	const b1 = size * size;
	for (let i = 0; i < px.length; i += 4) {
		const r = px[i] * step;
		const g = px[i + 1] * step;
		const b = px[i + 2] * step;
		const r0 = Math.floor(r);
		const g0 = Math.floor(g);
		const b0 = Math.floor(b);
		const fr = r - r0;
		const fg = g - g0;
		const fb = b - b0;
		const dr = r0 < max ? 1 : 0;
		const dg = g0 < max ? g1 : 0;
		const db = b0 < max ? b1 : 0;
		const base = r0 + g0 * g1 + b0 * b1;
		for (let c = 0; c < 3; c++) {
			const at = (offset: number) => data[(base + offset) * 4 + c];
			const lo = (at(0) * (1 - fr) + at(dr) * fr) * (1 - fg) + (at(dg) * (1 - fr) + at(dg + dr) * fr) * fg;
			const hi = (at(db) * (1 - fr) + at(db + dr) * fr) * (1 - fg) + (at(db + dg) * (1 - fr) + at(db + dg + dr) * fr) * fg;
			px[i + c] = lo * (1 - fb) + hi * fb;
		}
	}
	ctx.putImageData(image, 0, 0);
	return canvas;
}

type Scene = {
	ctx: CanvasRenderingContext2D;
	fields: FlierFields;
	palette: Palette;
	qr: QrStyle;
	art: FlierArt;
	link: string;
	editing?: TextKey;
	// Left undrawn, under an editor that shows its own text
	hide?: TextKey;
};

// `editing` keeps its place while empty, for an editor over it; it is still drawn, so typing shows as it will print
export function drawFlier(
	ctx: CanvasRenderingContext2D,
	fields: FlierFields,
	palette: Palette,
	qr: QrStyle,
	art: FlierArt,
	editing?: TextKey
): FlierLayout {
	ctx.save();
	ctx.fillStyle = palette.bg;
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
	const layout = LAYOUTS[art.design]({ ctx, fields, palette, qr, art, link: fields.link.trim() && qrLink(fields), editing });
	ctx.restore();
	return layout;
}

// The part of the photo in frame, in photo pixels, and how many flier pixels each one covers
export function photoCrop(photo: { width: number; height: number }, zoom: number, w: number, h: number) {
	const scale = Math.max(w / photo.width, h / photo.height) * zoom;
	return { w: w / scale, h: h / scale, scale };
}

// The photo cropped to cover `box`, inside `clip` when given
function fillPhoto({ ctx, art, palette }: Scene, box: Box, clip?: () => void, frame: Frame = art) {
	ctx.save();
	if (clip) {
		clip();
		ctx.clip();
	}
	const { photo, zoom, pan: [x, y] } = frame;
	if (photo) {
		const { w, h } = photoCrop(photo, zoom, box.w, box.h);
		ctx.drawImage(photo, (photo.width - w) * x, (photo.height - h) * y, w, h, box.x, box.y, box.w, box.h);
	} else {
		ctx.fillStyle = shade(palette.bg, 0.25);
		ctx.fillRect(box.x, box.y, box.w, box.h);
	}
	ctx.restore();
}

// A fade from clear at `from` to `color` at the box's bottom edge
function fadeDown(ctx: CanvasRenderingContext2D, box: Box, from: number, color: string, clip?: () => void) {
	ctx.save();
	if (clip) {
		clip();
		ctx.clip();
	}
	const fade = ctx.createLinearGradient(0, box.y + box.h * from, 0, box.y + box.h);
	fade.addColorStop(0, `${color}00`);
	fade.addColorStop(0.7, `${color}e6`);
	fade.addColorStop(1, color);
	ctx.fillStyle = fade;
	ctx.fillRect(box.x, box.y, box.w, box.h);
	ctx.restore();
}

function archPath(ctx: CanvasRenderingContext2D, { x, y, w, h }: Box) {
	const r = w / 2;
	ctx.beginPath();
	ctx.moveTo(x, y + h);
	ctx.lineTo(x, y + r);
	ctx.arc(x + r, y + r, r, Math.PI, 0);
	ctx.lineTo(x + w, y + h);
	ctx.closePath();
}

// A closed outline `r(t)` times the box's half size, swept round from the top
function polar(ctx: CanvasRenderingContext2D, { x, y, w, h }: Box, r: (t: number) => number, steps = 360) {
	ctx.beginPath();
	for (let i = 0; i < steps; i++) {
		const t = (i / steps) * Math.PI * 2 - Math.PI / 2;
		const k = r(t);
		ctx.lineTo(x + w / 2 + Math.cos(t) * (w / 2) * k, y + h / 2 + Math.sin(t) * (h / 2) * k);
	}
	ctx.closePath();
}

function corners(ctx: CanvasRenderingContext2D, points: [number, number][]) {
	ctx.beginPath();
	for (const [x, y] of points) ctx.lineTo(x, y);
	ctx.closePath();
}

function shapePath(ctx: CanvasRenderingContext2D, shape: Shape, box: Box) {
	const { x, y, w, h } = box;
	const cx = x + w / 2;
	const cy = y + h / 2;
	switch (shape) {
		case 'arch':
			return archPath(ctx, box);
		case 'circle':
			ctx.beginPath();
			return ctx.arc(cx, cy, Math.min(w, h) / 2, 0, Math.PI * 2);
		case 'oval':
			ctx.beginPath();
			return ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
		// Rounded and square share their corners
		case 'rounded':
		case 'square':
			ctx.beginPath();
			return ctx.roundRect(x, y, w, h, w * 0.16);
		case 'hexagon':
			return corners(ctx, [[cx, y], [x + w, y + h * 0.25], [x + w, y + h * 0.75], [cx, y + h], [x, y + h * 0.75], [x, y + h * 0.25]]);
		case 'flower':
			// Ten round petals
			return polar(ctx, box, (t) => 0.9 + 0.1 * Math.cos(10 * t));
		case 'burst':
			// Sixteen points, a sticker starburst
			return polar(ctx, box, (t) => (Math.round(((t + Math.PI / 2) / (Math.PI * 2)) * 32) % 2 ? 0.88 : 1), 32);
	}
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const logoHeight = ({ art }: Scene, width: number) => (width * art.logo.naturalHeight) / art.logo.naturalWidth;

// Returns the logo's visual bottom edge
function drawLogo(s: Scene, width: number, cx: number, y: number): number {
	const { ctx, art, palette } = s;
	const h = logoHeight(s, width);
	ctx.save();
	ctx.shadowColor = palette.shadow;
	ctx.shadowBlur = 28 * (width / LOGO_WIDTH);
	ctx.shadowOffsetY = 10 * (width / LOGO_WIDTH);
	ctx.drawImage(art.logo, cx - width / 2 + width * LOGO_NUDGE, y, width, h);
	ctx.restore();
	return y + h * LOGO_VISUAL;
}

// Handwritten, aligned to `x` (its right end, or its middle when centred) and tilted about that point
function drawTagline(
	{ ctx, fields, editing }: Scene,
	x: number,
	baseline: number,
	color: string,
	{
		tilt = TAGLINE_TILT,
		shadow,
		maxWidth = TAGLINE_WIDTH,
		size: start = 32,
		center = false
	}: { tilt?: number; shadow?: string; maxWidth?: number; size?: number; center?: boolean } = {}
): TextBox {
	const text = fields.tagline.trim();
	ctx.save();
	ctx.translate(x, baseline);
	ctx.rotate(tilt);
	let size = start;
	do ctx.font = `${size--}px ${SCRIPT}`;
	while (size > 20 && ctx.measureText(text).width > maxWidth);
	size++;
	ctx.fillStyle = color;
	ctx.textAlign = center ? 'center' : 'right';
	if (shadow) {
		ctx.shadowColor = shadow;
		ctx.shadowBlur = 12;
	}
	if (text) ctx.fillText(text, 0, 0, maxWidth);
	const w = Math.max(ctx.measureText(text).width, 280);
	ctx.restore();
	return {
		x: center ? x - w / 2 : x - w, y: baseline - size, w, h: size * 1.4, baselines: [baseline], size, weight: 400, family: SCRIPT,
		color, upper: false, lineHeight: size * 1.8, align: center ? 'center' : 'right', rotate: tilt,
		span: center ? [x - maxWidth / 2, maxWidth] : [x - maxWidth, maxWidth],
		empty: !text && editing !== 'tagline',
		end: center ? x + w / 2 : x
	};
}

type Line = {
	key: TextKey;
	text: string;
	size: number;
	weight: number;
	color: string;
	gap: number;
	upper: boolean;
	empty: boolean;
	// Set small and raised to the top of the line, like the st of 21st
	suffix?: string;
	// Sideways nudge, for type big enough that its own side bearing shows
	shift?: number;
};
type LineSpec = Omit<Line, 'key' | 'text' | 'upper' | 'empty'> & { upper?: boolean };

function line({ editing }: Scene, key: TextKey, text: string, spec: LineSpec): Line {
	return { key, text: text.trim(), upper: false, ...spec, empty: !text.trim() && key !== editing };
}

// Words broken into lines that fit `maxWidth` at the given type, the last taking whatever is left
function wrap(ctx: CanvasRenderingContext2D, text: string, font: string, maxWidth: number, maxLines: number): string[] {
	ctx.save();
	ctx.font = font;
	const lines: string[] = [];
	for (const word of text.trim().split(/\s+/)) {
		const last = lines[lines.length - 1];
		if (last !== undefined && (lines.length === maxLines || ctx.measureText(`${last} ${word}`.toUpperCase()).width <= maxWidth)) {
			lines[lines.length - 1] = `${last} ${word}`;
		} else {
			lines.push(word);
		}
	}
	// A lone word left on the last line takes the word before it along, where the two fit
	const n = lines.length;
	if (n > 1 && !lines[n - 1].includes(' ')) {
		const words = lines[n - 2].split(' ');
		const moved = `${words[words.length - 1]} ${lines[n - 1]}`;
		if (words.length > 1 && ctx.measureText(moved.toUpperCase()).width <= maxWidth) {
			lines[n - 2] = words.slice(0, -1).join(' ');
			lines[n - 1] = moved;
		}
	}
	ctx.restore();
	return lines.length ? lines : [''];
}

// Blank lines hold their place while the address is being typed
function addressLines(s: Scene, spec: (i: number) => LineSpec): Line[] {
	const address = s.fields.address.split('\n');
	const parts = s.editing === 'address' ? address : address.filter((part) => part.trim());
	return (parts.length ? parts : ['']).map((part, i) => line(s, 'address', part, spec(i)));
}

// Lines stacked bottom up to `bottom`, from `x` by `align`; `gap` is the space above a
// line's caps. Empty fields take no room but still get a box where they would appear.
function stack(
	s: Scene,
	lines: Line[],
	{ x, bottom, align, maxWidth, draw = true }: { x: number; bottom: number; align: Align; maxWidth: number; draw?: boolean }
) {
	const { ctx } = s;
	ctx.save();
	ctx.textBaseline = 'alphabetic';
	ctx.textAlign = align;
	let seen = false;
	const fitted = lines.map((line) => {
		const text = line.upper ? line.text.toUpperCase() : line.text;
		let size = line.size;
		// Long names shrink rather than run into their neighbours
		while (size > line.size * 0.6) {
			ctx.font = `${line.weight} ${size}px ${FONT}`;
			if (ctx.measureText(text).width <= maxWidth) break;
			size -= 2;
		}
		ctx.font = `${line.weight} ${size}px ${FONT}`;
		const gap = seen ? line.gap : 0;
		if (!line.empty) seen = true;
		const main = ctx.measureText(text).width;
		ctx.font = `${line.weight} ${size * SUFFIX}px ${FONT}`;
		const suffixWidth = line.suffix ? ctx.measureText(line.suffix.toUpperCase()).width + size * 0.04 : 0;
		return { ...line, text, size, gap, cap: size * 0.72, main, suffixWidth, width: Math.min(main + suffixWidth, maxWidth) };
	});
	let y = bottom - fitted.reduce((sum, line) => sum + (line.empty ? 0 : line.gap + line.cap), 0);
	const top = y;
	const text: FlierLayout['text'] = {};
	const width = (w: number) => (align === 'left' ? maxWidth : Math.max(w, 200));
	const left = (w: number) => (align === 'left' ? x : align === 'right' ? x - w : x - w / 2);
	const span: [number, number] = align === 'left' ? [x, maxWidth] : align === 'right' ? [x - maxWidth, maxWidth] : [x - maxWidth / 2, maxWidth];
	const box = (line: (typeof fitted)[number], baseline: number): TextBox => ({
		x: left(width(line.width)), y: baseline - line.cap, w: width(line.width), h: line.cap, baselines: [baseline],
		size: line.size, weight: line.weight, family: FONT, color: line.color, upper: line.upper, lineHeight: line.size * 1.25,
		align, rotate: 0, span, empty: line.empty,
		end: align === 'left' ? x + line.width : align === 'right' ? x : x + line.width / 2
	});
	for (const line of fitted) {
		const baseline = y + line.gap + line.cap;
		const prev = text[line.key];
		if (line.empty) {
			if (!prev) text[line.key] = box(line, baseline);
			continue;
		}
		y = baseline;
		ctx.font = `${line.weight} ${line.size}px ${FONT}`;
		ctx.fillStyle = line.color;
		if (draw && line.key !== s.hide) {
			// The suffix follows the main text, which moves over to keep the pair aligned as one
			const start = (align === 'left' ? x : align === 'right' ? x - line.width : x - line.width / 2) + (line.shift ?? 0);
			ctx.textAlign = 'left';
			ctx.fillText(line.text, start, y, maxWidth - line.suffixWidth);
			if (line.suffix) {
				ctx.font = `${line.weight} ${line.size * SUFFIX}px ${FONT}`;
				ctx.fillText(line.suffix.toUpperCase(), start + Math.min(line.main, maxWidth - line.suffixWidth) + line.size * 0.04, y - line.cap + line.size * SUFFIX * 0.72);
			}
			ctx.textAlign = align;
		}
		if (prev && !prev.empty) {
			prev.lineHeight = y - prev.baselines[prev.baselines.length - 1];
			prev.baselines.push(y);
			prev.h = y - prev.y;
			prev.w = Math.max(prev.w, width(line.width));
			prev.x = left(prev.w);
			if (align === 'left') prev.end = Math.max(prev.end, x + line.width);
			else if (align === 'center') prev.end = Math.max(prev.end, x + line.width / 2);
		} else {
			text[line.key] = box(line, y);
		}
	}
	ctx.restore();
	return { top, text };
}

// A small spaced-out caption, like a ticket's field names
function labelWidth(ctx: CanvasRenderingContext2D, text: string, size = 22) {
	ctx.save();
	labelFont(ctx, size);
	const w = ctx.measureText(text).width;
	ctx.restore();
	return w;
}

function labelFont(ctx: CanvasRenderingContext2D, size: number) {
	ctx.font = `700 ${size}px ${FONT}`;
	ctx.letterSpacing = `${size * 0.18}px`;
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, baseline: number, color: string, size = 22) {
	ctx.save();
	labelFont(ctx, size);
	ctx.fillStyle = color;
	ctx.fillText(text, x, baseline);
	ctx.restore();
}

// The logo and venue head as the polaroid and ticket set it: a modest logo, the venue and
// address as large as fit beside it, the venue held back a little under the address
const HEAD_TYPE = { maxLogo: 440, venueSize: 56, addressSize: 36, maxVenue: 80, venueRatio: 0.85, addressRatio: 0.62 };

// Logo on the left, venue and address right aligned beside it, between `left` and `right`.
// The text keeps the room its longest word or address line needs; the logo grows into the rest.
function logoHead(
	s: Scene,
	{
		left,
		right,
		top,
		accent,
		ink,
		maxLogo = 560,
		venueSize: baseVenue = 52,
		addressSize: baseAddress = 30,
		maxVenue = baseVenue,
		venueRatio = 1,
		addressRatio = 0.56
	}: {
		left: number;
		right: number;
		top: number;
		accent: string;
		ink: string;
		maxLogo?: number;
		venueSize?: number;
		addressSize?: number;
		// The venue grows up to this while it and the address still fit beside the logo
		maxVenue?: number;
		// The venue set at this share of the size the fit chose, leaving the address as it is
		venueRatio?: number;
		// The address against the venue size the fit tries
		addressRatio?: number;
	}
) {
	const { ctx, fields } = s;
	const inner = right - left;
	const widest = (font: string, parts: string[]) => {
		ctx.save();
		ctx.font = font;
		const w = Math.max(0, ...parts.map((part) => ctx.measureText(part).width));
		ctx.restore();
		return w;
	};
	const textWidth = Math.min(
		inner - 320,
		Math.max(
			380,
			widest(`800 ${baseVenue}px ${FONT}`, fields.venue.toUpperCase().split(/\s+/)),
			widest(`500 ${baseAddress}px ${FONT}`, fields.address.split('\n'))
		)
	);
	const logoWidth = Math.min(maxLogo, inner - 40 - textWidth);
	const height = logoHeight(s, logoWidth) * LOGO_VISUAL;
	const maxWidth = inner - 40 - logoWidth;
	drawLogo(s, logoWidth, left + logoWidth / 2, top);
	// Largest type whose lines fit the logo's height, from the cap height of each line and its gaps
	const addressCount = Math.max(1, fields.address.split('\n').filter((part) => part.trim()).length);
	let venueSize = maxVenue;
	let addressSize = baseAddress;
	for (; venueSize > baseVenue; venueSize -= 2) {
		addressSize = Math.max(baseAddress, Math.round(venueSize * addressRatio));
		const count = wrap(ctx, fields.venue, `800 ${venueSize}px ${FONT}`, maxWidth, 4).length;
		const tall = count * venueSize * 0.72 + (count - 1) * 12 + 20 + addressCount * addressSize * 0.72 + (addressCount - 1) * 14;
		if (tall <= height - 24) break;
	}
	if (venueSize <= baseVenue) [venueSize, addressSize] = [baseVenue, baseAddress];
	venueSize = Math.round(venueSize * venueRatio);
	const lines = [
		// Long names wrap beside the logo rather than shrink
		...wrap(ctx, fields.venue, `800 ${venueSize}px ${FONT}`, maxWidth, 4).map((part, i) =>
			line(s, 'venue', part, { size: venueSize, weight: 800, color: accent, gap: i ? 12 : 0, upper: true })
		),
		...addressLines(s, (i) => ({ size: addressSize, weight: 500, color: ink, gap: i ? 14 : 20 }))
	];
	// Hung from the top of the logo; stack sets lines from their foot, so find it from their caps
	const tall = lines.reduce((sum, l, i) => sum + (l.empty ? 0 : (i ? l.gap : 0) + l.size * 0.72), 0);
	const { text } = stack(s, lines, { x: right, bottom: top + 24 + tall, align: 'right', maxWidth });
	if (text.venue) text.venue.wrap = true;
	return { bottom: top + height, text };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
	ctx.fill();
}

// The QR code centred on (cx, cy), turned by `angle`; `behind` is what shows through without a tile
function drawQr(s: Scene, cx: number, cy: number, size: number, behind: string, angle = 0): FlierLayout['qr'] {
	const box = { x: cx - size / 2, y: cy - size / 2, w: size, h: size, behind };
	if (!s.link) return box;
	const { ctx, palette, art } = s;
	// Quartile error correction: room for the bean over the middle, with coarser modules than high
	const qr = qrcode(0, 'Q');
	qr.addData(s.link);
	qr.make();
	const n = qr.getModuleCount();
	const bg = s.qr.tile ?? behind;
	const fg = qrColor(palette, bg);
	// No margin when the tile would vanish into what is behind it
	const inset = bg === behind ? 0 : size * 0.064;
	const cell = (size - inset * 2) / n;
	const left = -size / 2 + inset;
	const top = -size / 2 + inset;

	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate(angle);
	ctx.fillStyle = bg;
	if (angle) {
		ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
		ctx.shadowBlur = 16;
		ctx.shadowOffsetY = 6;
	}
	roundRect(ctx, -size / 2, -size / 2, size, size, size * 0.072);
	ctx.shadowColor = 'transparent';

	const clear = Math.ceil(n * 0.24) | 1;
	const clearFrom = (n - clear) / 2;
	const inClear = (r: number, c: number) => r >= clearFrom && r < clearFrom + clear && c >= clearFrom && c < clearFrom + clear;
	const inFinder = (r: number, c: number) => (r < 7 || r >= n - 7) && (c < 7 || c >= n - 7) && !(r >= n - 7 && c >= n - 7);

	ctx.fillStyle = fg;
	for (let r = 0; r < n; r++) {
		for (let c = 0; c < n; c++) {
			if (!qr.isDark(r, c) || inFinder(r, c) || inClear(r, c)) continue;
			roundRect(ctx, left + c * cell + cell * 0.06, top + r * cell + cell * 0.06, cell * 0.88, cell * 0.88, cell * 0.3);
		}
	}
	for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
		const x = left + c * cell;
		const y = top + r * cell;
		ctx.fillStyle = fg;
		roundRect(ctx, x, y, cell * 7, cell * 7, cell * 2);
		ctx.fillStyle = bg;
		roundRect(ctx, x + cell, y + cell, cell * 5, cell * 5, cell * 1.4);
		ctx.fillStyle = fg;
		roundRect(ctx, x + cell * 2, y + cell * 2, cell * 3, cell * 3, cell);
	}

	const middle = clear * cell;
	const bh = middle * 0.9;
	const bw = (bh * art.bean.naturalWidth) / art.bean.naturalHeight;
	ctx.drawImage(art.bean, left + clearFrom * cell + (middle - bw) / 2, top + clearFrom * cell + (middle - bh) / 2, bw, bh);
	ctx.restore();
	return box;
}

// Point (x, y) turned by `angle` about (cx, cy)
function turn(cx: number, cy: number, angle: number, x: number, y: number): [number, number] {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [cx + x * cos - y * sin, cy + x * sin + y * cos];
}

const LAYOUTS: Record<Design, (s: Scene) => FlierLayout> = {
	classic,
	polaroid,
	bigdate: (s) => bigdate(s, false),
	bigsquare: (s) => bigdate(s, true),
	ticket,
	cassette,
	strip,
	shapes
};

// The shapes a layout takes; a shape outside them falls back to the first
export const LAYOUT_SHAPES: Partial<Record<Design, Shape[]>> = {
	bigdate: SHAPES.filter((c) => !c.round).map((c) => c.name),
	bigsquare: SHAPES.filter((c) => c.round).map((c) => c.name)
};

// The details column: venue, address, time, date and entry down the left
function details(s: Scene, color = s.palette.text, accent = s.palette.accent) {
	return [
		line(s, 'venue', s.fields.venue, { size: 54, weight: 800, color: accent, gap: 0, upper: true }),
		...addressLines(s, (i) => ({ size: 30, weight: 500, color, gap: i ? 14 : 22 })),
		line(s, 'time', s.fields.time, { size: 38, weight: 800, color, gap: 34, upper: true }),
		line(s, 'date', s.fields.date, { size: 38, weight: 800, color, gap: 12, upper: true }),
		line(s, 'entry', s.fields.entry, { size: 46, weight: 800, color: accent, gap: 22, upper: true })
	];
}

// Photo across the top fading into the field, logo over its edge, details and QR code below
function classic(s: Scene): FlierLayout {
	const { palette, art } = s;
	const photo = { x: 0, y: 0, w: WIDTH, h: art.height };
	fillPhoto(s, photo);
	fadeDown(s.ctx, photo, 0.45, palette.bg);
	const maxWidth = s.link ? WIDTH - PAD * 2 - QR_SIZE - 40 : WIDTH - PAD * 2;
	const { top, text } = stack(s, details(s), { x: PAD, bottom: HEIGHT - PAD, align: 'left', maxWidth });
	const showTagline = !!s.fields.tagline.trim() || s.editing === 'tagline';
	// The tagline sits between the logo and the details, lifting the logo when they run tall
	const baseline = top - 72;
	const limit = showTagline ? baseline - 32 : top - 30;
	drawLogo(s, LOGO_WIDTH, WIDTH / 2, Math.min(LOGO_TOP, limit - logoHeight(s, LOGO_WIDTH) * LOGO_VISUAL));
	text.tagline = drawTagline(s, WIDTH - PAD - 10, baseline, palette.accent);
	const qr = drawQr(s, WIDTH - PAD - QR_SIZE / 2, HEIGHT - PAD - QR_SIZE / 2, QR_SIZE, palette.bg);
	return { photo, qr, field: [WIDTH - 28, Math.min(art.height + 40, HEIGHT - PAD - 310)], text };
}

// A taped up instant print between a logo and venue head and the date along the foot
function polaroid(s: Scene): FlierLayout {
	const { ctx, palette, fields } = s;
	const head = logoHead(s, { left: PAD, right: WIDTH - PAD, top: 40, accent: palette.accent, ink: palette.text, ...HEAD_TYPE });

	// Date and time down the left, entry right, along the foot, at `grow` times their usual size
	const leftWidth = 560;
	const foot = (grow: number, draw: boolean) => {
		const size = (n: number) => Math.round(n * grow);
		const when = stack(
			s,
			[
				...wrap(ctx, fields.date, `800 ${size(44)}px ${FONT}`, leftWidth, 2).map((part, i) =>
					line(s, 'date', part, { size: size(44), weight: 800, color: palette.text, gap: i ? size(10) : 0, upper: true })
				),
				line(s, 'time', fields.time, { size: size(44), weight: 800, color: palette.text, gap: size(14), upper: true })
			],
			{ x: PAD, bottom: HEIGHT - PAD, align: 'left', maxWidth: leftWidth, draw }
		);
		const entry = stack(s, [line(s, 'entry', fields.entry, { size: size(50), weight: 800, color: palette.accent, gap: 0, upper: true })], {
			x: WIDTH - PAD, bottom: HEIGHT - PAD, align: 'right', maxWidth: WIDTH - PAD * 2 - leftWidth - 40, draw
		});
		return { when, entry, top: Math.min(when.top, entry.top) };
	};

	// A shorter print gives up room; the foot's type grows into some of it, the print keeps its share
	const top = head.bottom + 50;
	const plain = foot(1, false);
	const room = plain.top - 60 - top;
	const printH = room * s.art.printScale;
	const footH = HEIGHT - PAD - plain.top;
	const grow = Math.min(1.6, (footH + (room - printH) * 0.6) / footH);
	const { when, entry, top: footTop } = foot(grow, true);
	if (when.text.date) when.text.date.wrap = true;

	// The print sits between, tilted, clear of the head and the foot
	const angle = -0.045;
	const bottom = footTop - 60;
	// A shorter print widens, so it still fills the space, up to the side margins
	const card = { w: Math.min(WIDTH - PAD * 2 - 20, 700 / s.art.printScale), h: Math.min(printH, bottom - top) };
	const cx = WIDTH / 2;
	const cy = (top + bottom) / 2;
	const photo = { x: -card.w / 2 + 36, y: -card.h / 2 + 36, w: card.w - 72, h: card.h - 36 - 110 };

	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate(angle);
	ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
	ctx.shadowBlur = 36;
	ctx.shadowOffsetY = 14;
	ctx.fillStyle = PRINT;
	ctx.fillRect(-card.w / 2, -card.h / 2, card.w, card.h);
	ctx.shadowColor = 'transparent';
	fillPhoto(s, photo);
	// Masking tape over the top corners
	ctx.fillStyle = 'rgba(215, 153, 33, 0.45)';
	for (const side of [-1, 1]) {
		ctx.save();
		ctx.translate(side * (card.w / 2 - 40), -card.h / 2 + 4);
		ctx.rotate(side * 0.6);
		ctx.fillRect(-80, -22, 160, 44);
		ctx.restore();
	}
	ctx.restore();

	// The QR code: a cream sticker over the print's corner, hanging off it, still clear of the
	// entry below, and kept inside the margin when the print runs wide
	const qrSize = 270;
	const qrX = Math.min(card.w / 2 + 10, WIDTH - PAD - qrSize / 2 - cx);
	const qr = drawQr({ ...s, qr: { tile: QR_TILES[0].bg } }, ...turn(cx, cy, angle, qrX, card.h / 2 - 40), qrSize, PRINT, 0.1);
	// The tagline written in the margin, ending short of the sticker
	const end = Math.min(card.w / 2 - 180, qrX - qrSize / 2 - 20);
	const [right, baseline] = turn(cx, cy, angle, end, card.h / 2 - 42);
	const tagline = drawTagline(s, right, baseline, PRINT_INK, { tilt: angle, maxWidth: end + card.w / 2 - 70, size: 38 });
	// The tagline's callout joins the left, just above the date's
	tagline.side = 'left';
	if (when.text.date) tagline.sortY = when.text.date.y - 1;
	const shot = { x: cx + photo.x, y: cy + photo.y, w: photo.w, h: photo.h };
	return {
		photo: shot,
		qr,
		// The right margin is clear all the way down, so the colour callout sits mid flier with a level line
		field: [WIDTH - 28, HEIGHT / 2],
		fieldSpan: [PAD, HEIGHT - PAD],
		photoAnchor: [shot.x + 28, shot.y + 24],
		photoCalloutY: 200,
		text: { ...head.text, ...when.text, ...entry.text, tagline }
	};
}

// The date set huge beside a portrait shape, or, with `square`, top right over a square one
function bigdate(s: Scene, square: boolean): FlierLayout {
	const { ctx, palette, fields, art } = s;
	const allowed = SHAPES.filter((c) => !!c.round === square);
	const shape = allowed.find((c) => c.name === art.shape) ?? allowed[0];
	// The venue may wrap, in the column the corner QR code leaves it
	const detailsFor = (width: number) => [
		...wrap(ctx, fields.venue, `800 54px ${FONT}`, width, 2).map((part, i) =>
			line(s, 'venue', part, { size: 54, weight: 800, color: palette.accent, gap: i ? 10 : 0, upper: true })
		),
		...addressLines(s, (i) => ({ size: 30, weight: 500, color: palette.text, gap: i ? 14 : 22 })),
		line(s, 'entry', fields.entry, { size: 44, weight: 800, color: palette.accent, gap: 30, upper: true })
	];
	// Held to the slot; its largest size fills it
	const scale = Math.min(1, art.shapeScale * SHAPE_GROW);
	// The details decide the shape's room, the shape the QR code's size, and that the details'
	// width; a measuring pass settles it, and a second if the venue then wraps onto another line
	// Beside a round shape the QR code sits in the flier's corner and grows into the corner of the
	// shape's box the curve leaves empty, keeping the gap from the curve itself; a square only leaves
	// its rounded corner. Under the date and tagline, and the details keep some width.
	const cornerQr = (d: number, y: number) => {
		const [cx, cy, r] = [PAD + d / 2, y + d / 2, d / 2];
		const clear = (q: number) => {
			const [qx, qy] = [WIDTH - PAD - q, HEIGHT - PAD - q];
			if (shape.name === 'square') {
				// Clear of the box, or tucked into the curve of its rounded corner
				const [right, foot, rc] = [PAD + d, y + d, d * 0.16];
				if (qx >= right + QR_GAP || qy >= foot + QR_GAP) return true;
				return qx > right - rc && qy > foot - rc && Math.hypot(qx - (right - rc), qy - (foot - rc)) - rc >= QR_GAP;
			}
			return Math.hypot(cx - clamp(cx, qx, WIDTH - PAD), cy - clamp(cy, qy, HEIGHT - PAD)) >= r + QR_GAP;
		};
		let q = Math.min(HEIGHT - PAD - DATE_TOP_BOTTOM - 110, WIDTH - PAD * 2 - 40 - 360);
		while (q > QR_MIN && !clear(q)) q -= 2;
		return q;
	};

	const settle = (width: number) => {
		const details = detailsFor(width);
		const detailsTop = stack(s, details, { x: PAD, bottom: HEIGHT - PAD, align: 'left', maxWidth: width, draw: false }).top;
		// The shape fills the right side down to just over the QR code and the details
		const slotBottom = shape.round ? detailsTop - 50 : Math.min(HEIGHT - PAD - QR_MIN - QR_GAP, detailsTop - 50);
		// Round shapes leave at least the smallest QR code beside them
		const d = Math.min(slotBottom - ROUND_TOP, WIDTH - PAD * 2 - QR_GAP - QR_MIN) * scale;
		// Beside a portrait shape the QR code grows up into the room a smaller shape leaves under
		// it, keeping clear of the date column and leaving the details some width
		const portraitFoot = PAD + (slotBottom - PAD) * scale;
		const qrSize = shape.round
			? cornerQr(d, (ROUND_TOP + slotBottom - d) / 2)
			: clamp(HEIGHT - PAD - portraitFoot - QR_GAP, 230, Math.min(WIDTH - PAD - 452, WIDTH - PAD * 2 - 40 - 380));
		const textWidth = s.link ? WIDTH - PAD * 2 - qrSize - 40 : WIDTH - PAD * 2;
		return { details, slotBottom, d, qrSize, textWidth };
	};
	let fit = settle(WIDTH - PAD * 2);
	fit = settle(fit.textWidth);
	const { details, slotBottom, d, qrSize, textWidth } = fit;
	const slot = { x: 452, y: PAD, w: WIDTH - PAD - 452, h: slotBottom - PAD };
	// Stretchable shapes fill the slot on the right. Round ones would be held to its width,
	// so they take the lower left under the logo instead, centred between it and the venue,
	// and the date moves top right.
	const photo = shape.round
		? { x: PAD, y: (ROUND_TOP + slotBottom - d) / 2, w: d, h: d }
		// Held to the top of its slot, so the room it gives up gathers under it for the QR code
		: { x: slot.x + (slot.w * (1 - scale)) / 2, y: slot.y, w: slot.w * scale, h: slot.h * scale };
	fillPhoto(s, photo, () => shapePath(ctx, shape.name, photo));
	ctx.save();
	ctx.strokeStyle = palette.accent;
	ctx.lineWidth = 4;
	ctx.globalAlpha = 0.85;
	shapePath(ctx, shape.name, { x: photo.x - 16, y: photo.y - 16, w: photo.w + 32, h: photo.h + 32 });
	ctx.stroke();
	ctx.restore();
	drawLogo(s, 360, PAD + 180, PAD);

	// "Friday, August 21st" sets as FRI / 21 / AUG; anything else sets as one line
	const parts = fields.date.match(/^\s*([A-Za-z]+)[,\s]+([A-Za-z]+)\s+(\d{1,2})/);
	const column = shape.round
		// Top right, beside the logo, with room for the weekday in full
		? { x: WIDTH - PAD, bottom: DATE_TOP_BOTTOM, align: 'right' as const, maxWidth: WIDTH - PAD * 2 - 360 - 40 }
		: { x: PAD, bottom: DATE_BOTTOM, align: 'left' as const, maxWidth: 360 };
	const dateLines = parts
		? [
				line(s, 'date', shape.round ? parts[1] : parts[1].slice(0, 3), { size: 92, weight: 800, color: palette.accent, gap: 0, upper: true }),
				// Smaller beside a round shape; on the left, nudged out to line up with the type around it
				line(s, 'date', parts[3], {
					size: shape.round ? 240 : 300, weight: 800, color: palette.text, gap: 28, upper: true,
					suffix: ordinalSuffix(+parts[3]), shift: shape.round ? 0 : -20
				}),
				line(s, 'date', parts[2].slice(0, 3), { size: 110, weight: 800, color: palette.accent, gap: 30, upper: true })
			]
		: [line(s, 'date', fields.date, { size: 56, weight: 800, color: palette.text, gap: 0, upper: true })];
	if (parts && s.editing === 'date') s.hide = 'date';
	const date = stack(
		s,
		[...dateLines, line(s, 'time', fields.time, { size: 50, weight: 800, color: palette.text, gap: 44, upper: true })],
		column
	);
	s.hide = undefined;
	// Edited as one plain line, not at poster size
	const box = date.text.date;
	if (box && parts) {
		Object.assign(box, { size: 56, lineHeight: 70, baselines: [box.y + box.h / 2 + 20], span: [PAD, WIDTH - PAD * 2], own: true });
	}

	// Beside a round shape the QR code takes the width the shape leaves, so it shrinks as the
	// shape grows, and sits down in the corner under the date and tagline, the details beside it.
	// Otherwise it keeps the corner at its usual size.
	const qrColumn = WIDTH - PAD - (PAD + d + QR_GAP);
	const qr = drawQr(s, WIDTH - PAD - qrSize / 2, HEIGHT - PAD - qrSize / 2, qrSize, palette.bg);
	const info = stack(s, details, { x: PAD, bottom: HEIGHT - PAD, align: 'left', maxWidth: textWidth });
	if (info.text.venue) info.text.venue.wrap = true;
	// Written under the time in the date's column
	const tagline = shape.round
		? drawTagline(s, WIDTH - PAD, DATE_TOP_BOTTOM + 64, palette.accent, { maxWidth: qrColumn })
		: drawTagline(s, PAD + 360, DATE_BOTTOM + 64, palette.accent, { maxWidth: 360 });
	// Beside a portrait shape the tagline sits in the date's column, so its callout joins the left
	if (!shape.round) tagline.side = 'left';
	return {
		photo,
		qr,
		// Beside a portrait shape the right margin is clear all the way down: a level line, mid flier
		field: shape.round ? [WIDTH - 28, DATE_TOP_BOTTOM + 120] : [WIDTH - 28, HEIGHT / 2],
		fieldSpan: shape.round ? undefined : [PAD, HEIGHT - PAD],
		photoAnchor: shape.round ? undefined : [photo.x + 28, photo.y + photo.h * 0.12],
		// Its callout and menu start at the top of the column, above the date's
		photoCalloutY: shape.round ? undefined : 0,
		text: { ...date.text, ...info.text, tagline }
	};
}

// Card stock for the ticket and cassette. On a dark field it is cream, inked in the field's colour.
// On a light one it is white paper in the palette's own ink, its accent marking the key details.
function stock(palette: Palette) {
	const light = isLight(palette);
	const paper = light ? PRINT : palette.text;
	const ink = light ? palette.text : contrast(palette.bg, paper) >= 4.5 ? palette.bg : shade(palette.bg, 0.55);
	const mark = light ? palette.accent : contrast(palette.bg, paper) >= 3 ? palette.bg : shade(palette.bg, 0.35);
	return { paper, ink, mark };
}

// An admission ticket: logo and venue at its head, the picture under them, the stub's fields below the tear line
function ticket(s: Scene): FlierLayout {
	const { ctx, palette, fields } = s;
	const { paper, ink, mark } = stock(palette);
	const t ={ x: 56, y: 40, w: WIDTH - 112, h: HEIGHT - 80 };
	const tear = 980;

	ctx.save();
	ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
	ctx.shadowBlur = 30;
	ctx.shadowOffsetY = 12;
	ctx.fillStyle = paper;
	// Notches either end of the tear line are cut from the outline, so the shadow follows them
	const r = 28;
	const [left, right, bottom] = [t.x, t.x + t.w, t.y + t.h];
	ctx.beginPath();
	ctx.moveTo(left + r, t.y);
	ctx.arcTo(right, t.y, right, bottom, r);
	ctx.arc(right, tear, 30, -Math.PI / 2, Math.PI / 2, true);
	ctx.arcTo(right, bottom, left, bottom, r);
	ctx.arcTo(left, bottom, left, t.y, r);
	ctx.arc(left, tear, 30, Math.PI / 2, -Math.PI / 2, true);
	ctx.arcTo(left, t.y, right, t.y, r);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
	ctx.save();
	ctx.strokeStyle = ink;
	ctx.globalAlpha = 0.35;
	ctx.lineWidth = 3;
	ctx.setLineDash([14, 10]);
	ctx.beginPath();
	ctx.moveTo(t.x + 50, tear);
	ctx.lineTo(t.x + t.w - 50, tear);
	ctx.stroke();
	ctx.restore();

	const head = logoHead(s, {
		left: t.x + 44, right: t.x + t.w - 44, top: t.y + 40, accent: mark, ink, ...HEAD_TYPE
	});

	// The picture fills the rest of the ticket down to the tear line
	const photoTop = head.bottom + 48;
	const photo = { x: t.x + 36, y: photoTop, w: t.w - 72, h: tear - 36 - photoTop };
	fillPhoto(s, photo, () => {
		ctx.beginPath();
		ctx.roundRect(photo.x, photo.y, photo.w, photo.h, 18);
	});
	const tagline = drawTagline(s, photo.x + photo.w - 24, photo.y + photo.h - 30, '#fbf1c7', { shadow: 'rgba(0, 0, 0, 0.8)' });

	drawLabel(ctx, 'ADMIT ONE', t.x + 44, tear + 64, mark, 24);
	// Values start just past the widest caption
	const valueX = t.x + 44 + Math.max(...['DATE', 'TIME', 'ENTRY'].map((label) => labelWidth(ctx, label))) + 28;
	// The QR code takes the room the widest value leaves, up to the stub's own height
	ctx.save();
	ctx.font = `800 40px ${FONT}`;
	const widest = Math.max(...(['date', 'time', 'entry'] as const).map((key) => ctx.measureText(fields[key].toUpperCase()).width));
	ctx.restore();
	const qrSize = clamp(t.x + t.w - 40 - valueX - widest - 30, 230, t.y + t.h - tear - 48);
	const maxWidth = t.x + t.w - 40 - qrSize - 30 - valueX;
	// Rows centre in the stub below ADMIT ONE; the QR code, bigger, centres on the whole stub
	const middle = (tear + 90 + t.y + t.h - 30) / 2;
	const rowGap = 70;
	const rows = (['date', 'time', 'entry'] as const).map((key, i) => {
		// Caps centred on the middle row
		const baseline = middle + (i - 1) * rowGap + 14;
		ctx.save();
		ctx.globalAlpha = 0.6;
		drawLabel(ctx, key.toUpperCase(), t.x + 44, baseline - 4, ink);
		ctx.restore();
		const color = key === 'entry' ? mark : ink;
		const row = stack(s, [line(s, key, fields[key], { size: 40, weight: 800, color, gap: 0, upper: true })], {
			x: valueX, bottom: baseline, align: 'left', maxWidth
		}).text;
		// Lines meet the printed caption rather than crossing it to the value
		row[key]!.anchor = [t.x + 30, baseline - 12];
		return row;
	});
	const qr = drawQr(s, t.x + t.w - 40 - qrSize / 2, (tear + t.y + t.h) / 2, qrSize, paper);
	return {
		photo,
		qr,
		// Down beside the photo, so the colour callout falls under the venue and address
		field: [WIDTH - 28, photo.y + 60],
		photoAnchor: [photo.x + 28, photo.y + photo.h * 0.15],
		text: Object.assign({ tagline }, head.text, ...rows)
	};
}

// A cassette's insert opened flat: venue and date down the spine, the logo and venue head over
// the photo on the front, and the rest set as its tracklist
function cassette(s: Scene): FlierLayout {
	const { ctx, palette, fields } = s;
	const { paper, ink, mark } = stock(palette);
	const c = { x: 56, y: 40, w: WIDTH - 112, h: HEIGHT - 80 };
	const fold = c.x + 116;
	const right = c.x + c.w;
	const foot = c.y + c.h;

	ctx.save();
	ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
	ctx.shadowBlur = 30;
	ctx.shadowOffsetY = 12;
	ctx.fillStyle = paper;
	roundRect(ctx, c.x, c.y, c.w, c.h, 12);
	ctx.restore();
	// The spine's fold, scored
	ctx.save();
	ctx.strokeStyle = ink;
	ctx.globalAlpha = 0.35;
	ctx.lineWidth = 3;
	ctx.setLineDash([14, 10]);
	ctx.beginPath();
	ctx.moveTo(fold, c.y + 24);
	ctx.lineTo(fold, foot - 24);
	ctx.stroke();
	ctx.restore();

	// The spine reads bottom to top
	ctx.save();
	ctx.translate((c.x + fold) / 2, c.y + c.h / 2);
	ctx.rotate(-Math.PI / 2);
	labelFont(ctx, 34);
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = mark;
	const spine = [fields.venue, fields.date].map((t) => t.trim().toUpperCase()).filter(Boolean).join('  /  ');
	ctx.fillText(spine, 0, 0, c.h - 120);
	ctx.restore();

	const head = logoHead(s, { left: fold + 44, right: right - 44, top: c.y + 40, accent: mark, ink, ...HEAD_TYPE });

	// The tracklist: each detail captioned and ruled off, the QR code centred beside them
	const tracks = ['date', 'time', 'entry'] as const;
	const rowGap = 74;
	const last = foot - 64;
	const first = last - (tracks.length - 1) * rowGap;
	const qrSize = 250;
	const qrCy = (first - 40 + last + 22) / 2;
	const listRight = right - 44 - qrSize - 36;
	const valueX = fold + 44 + Math.max(...tracks.map((key) => labelWidth(ctx, key.toUpperCase()))) + 28;
	const rows = tracks.map((key, i) => {
		const baseline = first + i * rowGap;
		drawLabel(ctx, key.toUpperCase(), fold + 44, baseline - 4, mark);
		ctx.save();
		ctx.strokeStyle = ink;
		ctx.globalAlpha = 0.2;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(fold + 44, baseline + 22);
		ctx.lineTo(listRight, baseline + 22);
		ctx.stroke();
		ctx.restore();
		const row = stack(s, [line(s, key, fields[key], { size: 40, weight: 800, color: key === 'entry' ? mark : ink, gap: 0, upper: true })], {
			x: valueX, bottom: baseline, align: 'left', maxWidth: listRight - valueX
		}).text;
		// Lines meet the caption rather than crossing it to the value
		row[key]!.anchor = [fold + 30, baseline - 12];
		return row;
	});
	const qr = drawQr(s, right - 44 - qrSize / 2, qrCy, qrSize, paper);

	// The photo fills the front between the head and the tracklist
	const photoTop = head.bottom + 44;
	const photo = { x: fold + 36, y: photoTop, w: right - 36 - fold - 36, h: Math.min(first - 40, qrCy - qrSize / 2) - 48 - photoTop };
	fillPhoto(s, photo, () => {
		ctx.beginPath();
		ctx.roundRect(photo.x, photo.y, photo.w, photo.h, 18);
	});
	const tagline = drawTagline(s, photo.x + photo.w - 24, photo.y + photo.h - 30, '#fbf1c7', { shadow: 'rgba(0, 0, 0, 0.8)' });
	return {
		photo,
		qr,
		field: [WIDTH - 28, HEIGHT / 2],
		fieldSpan: [c.y, foot],
		text: Object.assign({ tagline }, head.text, ...rows)
	};
}

// A photo booth strip down the left, a square frame for each photo and the bean printed at its
// foot; the logo, details and tagline down the right, the QR code under them
function strip(s: Scene): FlierLayout {
	const { ctx, palette, fields, art } = s;
	const n = Math.max(1, art.frames.length);
	const [border, gap, foot] = [24, 18, 120];
	const height = HEIGHT - 80;
	const side = (height - border - foot - gap * (n - 1)) / n;
	const print = { x: PAD, y: 40, w: side + border * 2, h: height };
	// Tilted about its middle; the frames' boxes stay upright, centred where each one lands
	const angle = -0.035;
	const [cx, cy] = [print.x + print.w / 2, print.y + print.h / 2];

	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate(angle);
	ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
	ctx.shadowBlur = 36;
	ctx.shadowOffsetY = 14;
	ctx.fillStyle = PRINT;
	ctx.fillRect(-print.w / 2, -print.h / 2, print.w, print.h);
	ctx.shadowColor = 'transparent';
	const frames = Array.from({ length: n }, (_, i) => {
		const local = { x: -print.w / 2 + border, y: -print.h / 2 + border + i * (side + gap), w: side, h: side };
		fillPhoto(s, local, undefined, art.frames[i] ?? art);
		const [x, y] = turn(cx, cy, angle, local.x + side / 2, local.y + side / 2);
		return { x: x - side / 2, y: y - side / 2, w: side, h: side };
	});
	const bh = foot * 0.5;
	const bw = (bh * art.littleBean.naturalWidth) / art.littleBean.naturalHeight;
	ctx.drawImage(art.littleBean, -bw / 2, print.h / 2 - (foot + bh) / 2, bw, bh);
	ctx.restore();

	// Clear of the strip's lower right corner, which the tilt swings out
	const left = print.x + print.w + 80;
	const width = WIDTH - PAD - left;
	const logoBottom = drawLogo(s, Math.min(width, 560), left + width / 2, 64);
	// The details at `grow` times their usual size
	const linesAt = (grow: number) => {
		const size = (n: number) => Math.round(n * grow);
		return [
			...wrap(ctx, fields.venue, `800 ${size(54)}px ${FONT}`, width, 3).map((part, i) =>
				line(s, 'venue', part, { size: size(54), weight: 800, color: palette.accent, gap: i ? size(10) : 0, upper: true })
			),
			...addressLines(s, (i) => ({ size: size(30), weight: 500, color: palette.text, gap: size(i ? 14 : 22) })),
			...wrap(ctx, fields.date, `800 ${size(44)}px ${FONT}`, width, 2).map((part, i) =>
				line(s, 'date', part, { size: size(44), weight: 800, color: palette.text, gap: size(i ? 10 : 34), upper: true })
			),
			line(s, 'time', fields.time, { size: size(44), weight: 800, color: palette.text, gap: size(12), upper: true }),
			line(s, 'entry', fields.entry, { size: size(46), weight: 800, color: palette.accent, gap: size(22), upper: true })
		];
	};
	const tall = (lines: Line[]) => -stack(s, lines, { x: left, bottom: 0, align: 'left', maxWidth: width, draw: false }).top;
	// The type grows to fill the room between the logo and the QR code, less the tagline's when it has one
	const showTagline = !!fields.tagline.trim() || s.editing === 'tagline';
	const top = logoBottom + 100;
	const room = HEIGHT - PAD - QR_SIZE - 56 - top - (showTagline ? 100 : 0);
	let grow = 1.8;
	while (grow > 1 && tall(linesAt(grow)) > room) grow -= 0.05;
	const lines = linesAt(grow);
	const bottom = top + tall(lines);
	const info = stack(s, lines, { x: left, bottom, align: 'left', maxWidth: width });
	if (info.text.venue) info.text.venue.wrap = true;
	if (info.text.date) info.text.date.wrap = true;
	const tagline = drawTagline(s, WIDTH - PAD, bottom + 90, palette.accent, { maxWidth: width, size: Math.round(32 * Math.min(grow, 1.4)) });
	const qr = drawQr(s, WIDTH - PAD - QR_SIZE / 2, HEIGHT - PAD - QR_SIZE / 2, QR_SIZE, palette.bg);
	return {
		photo: print,
		frames,
		qr,
		field: [WIDTH - 28, HEIGHT / 2],
		fieldSpan: [PAD, HEIGHT - PAD],
		text: { ...info.text, tagline }
	};
}

// Symmetrical: the photo cut to a shape in the middle, logo across its foot, details centred beneath
function shapes(s: Scene): FlierLayout {
	const { ctx, palette, fields, art } = s;
	const shape = SHAPES.find((c) => c.name === art.shape) ?? SHAPES[0];
	const size = art.shapeScale * SHAPE_GROW;
	const w = 600 * size;
	const photo = { x: (WIDTH - w) / 2, y: PAD, w, h: shape.height * size };
	const clip = () => shapePath(ctx, shape.name, photo);

	const cx = WIDTH / 2;
	const qrSize = 250;
	// The details centre in the room beside the QR code, not on the flier, so they get its width
	const textRight = WIDTH - PAD - qrSize - 36;
	const tx = (PAD + textRight) / 2;
	const maxWidth = textRight - PAD;
	const entry = stack(s, [line(s, 'entry', fields.entry, { size: 46, weight: 800, color: palette.accent, gap: 0, upper: true })], {
		x: tx, bottom: HEIGHT - PAD, align: 'center', maxWidth
	});
	const when = pair(s, tx, entry.top - 26, maxWidth);
	const address = fields.address.split('\n').map((part) => part.trim().replace(/,$/, '')).filter(Boolean).join(', ');
	// Joined on one line, so it edits as its separate lines in an editor of its own
	if (s.editing === 'address') s.hide = 'address';
	const where = stack(
		s,
		[
			// Wraps rather than shrinks in the column the QR code leaves
			...wrap(ctx, fields.venue, `800 54px ${FONT}`, maxWidth, 2).map((part, i) =>
				line(s, 'venue', part, { size: 54, weight: 800, color: palette.accent, gap: i ? 10 : 0, upper: true })
			),
			line(s, 'address', address, { size: 30, weight: 500, color: palette.text, gap: 16 })
		],
		{ x: tx, bottom: when.top - 30, align: 'center', maxWidth }
	);
	s.hide = undefined;
	if (where.text.address) where.text.address.own = true;
	if (where.text.venue) where.text.venue.wrap = true;
	// The tagline sits centred over the details, lifting the logo when there is one
	const showTagline = !!fields.tagline.trim() || s.editing === 'tagline';
	const baseline = where.top - 30;
	// A smaller shape gets a smaller logo with more air under it
	const small = Math.max(0, 1 - size);
	const logoWidth = 640 * Math.min(1, 0.55 + 0.45 * size);
	const gap = 70 + small * 120;
	const limit = showTagline ? baseline - 44 - (gap - 40) : where.top - gap;
	// Centred between the shape's foot and the text; a logo taller than the gap overlaps the shape, never the text
	const logoH = logoHeight(s, logoWidth) * LOGO_VISUAL;
	const logoY = Math.min(limit - logoH, (photo.y + photo.h + limit - logoH) / 2);

	// The photo fades from a little above where the logo starts covering it, so a deep overlap
	// gets a long fade and a shallow one only a soft foot
	fillPhoto(s, photo, clip);
	fadeDown(ctx, photo, clamp((logoY - 60 - photo.y) / photo.h, 0.15, 0.85), palette.bg, clip);
	ctx.save();
	ctx.strokeStyle = palette.accent;
	ctx.lineWidth = 4;
	ctx.globalAlpha = 0.85;
	shapePath(ctx, shape.name, { x: photo.x - 16, y: photo.y - 16, w: photo.w + 32, h: photo.h + 32 });
	ctx.stroke();
	ctx.restore();
	drawLogo(s, logoWidth, cx, logoY);
	const tagline = drawTagline(s, tx, baseline, palette.accent, { maxWidth, center: true });
	const qr = drawQr(s, WIDTH - PAD - qrSize / 2, HEIGHT - PAD - qrSize / 2, qrSize, palette.bg);
	return { photo, qr, field: [WIDTH - 28, 420], text: { ...where.text, ...when.text, ...entry.text, tagline } };
}

// Time and date on one centred line, a dot between them
function pair(s: Scene, cx: number, baseline: number, maxWidth: number) {
	const { ctx, palette, fields, editing } = s;
	const parts = (['time', 'date'] as const).map((key) => ({ key, text: fields[key].trim().toUpperCase() }));
	const shown = parts.filter((p) => p.text || p.key === editing);
	let size = 36;
	const gap = 44;
	const measure = () => {
		ctx.font = `800 ${size}px ${FONT}`;
		return shown.map((p) => ctx.measureText(p.text).width);
	};
	let widths = measure();
	while (size > 30 && widths.reduce((a, b) => a + b, 0) + gap * (shown.length - 1) > maxWidth) {
		size -= 2;
		widths = measure();
	}
	const total = widths.reduce((a, b) => a + b, 0) + gap * (shown.length - 1);
	// Too long to share a line at a readable size: time over date, both centred
	if (total > maxWidth) {
		return stack(
			s,
			[
				line(s, 'time', fields.time, { size: 36, weight: 800, color: palette.text, gap: 0, upper: true }),
				line(s, 'date', fields.date, { size: 36, weight: 800, color: palette.text, gap: 12, upper: true })
			],
			{ x: cx, bottom: baseline, align: 'center', maxWidth }
		);
	}
	let x = cx - total / 2;
	const text: FlierLayout['text'] = {};
	ctx.save();
	ctx.fillStyle = palette.text;
	shown.forEach((p, i) => {
		if (p.key !== s.hide) ctx.fillText(p.text, x, baseline);
		text[p.key] = {
			x, y: baseline - size * 0.72, w: Math.max(widths[i], 120), h: size * 0.72, baselines: [baseline], size, weight: 800,
			family: FONT, color: palette.text, upper: true, lineHeight: size * 1.25, align: 'left', rotate: 0,
			span: [x, Math.max(widths[i] + 120, 320)], empty: false, end: x + widths[i]
		};
		x += widths[i];
		if (i < shown.length - 1) {
			ctx.fillStyle = palette.accent;
			ctx.beginPath();
			ctx.arc(x + gap / 2, baseline - size * 0.36, 6, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = palette.text;
			x += gap;
		}
	});
	ctx.restore();
	// Empty halves keep a slot at the line's middle
	for (const p of parts) {
		if (!text[p.key]) {
			text[p.key] = {
				x: cx - 100, y: baseline - size * 0.72, w: 200, h: size * 0.72, baselines: [baseline], size, weight: 800,
				family: FONT, color: palette.text, upper: true, lineHeight: size * 1.25, align: 'center', rotate: 0,
				span: [cx - maxWidth / 2, maxWidth], empty: true, end: cx + 100
			};
		}
	}
	return { top: baseline - size * 0.72, text };
}
