export const VINE_WIDTH = 44;

export interface Leaf {
	x: number;
	y: number;
	angle: number;
	length: number;
	width: number;
	tone: number;
	/** Drawn beneath the beans, because one hangs across its base */
	under: boolean;
}

/** The outlines of one bean pod, in a frame where it hangs along +x from its stalk at the origin. */
export interface Pod {
	stalk: string;
	cap: string;
	body: string;
	highlight: string;
	seam: string;
	tail: string;
}

/** A string bean hanging from the stem. */
export interface Bean extends Pod {
	x: number;
	y: number;
	angle: number;
	/** Hangs in front of the leaves rather than behind them */
	front: boolean;
}

export interface Vine {
	stem: string;
	leaves: Leaf[];
	beans: Bean[];
}

function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export interface VineOptions {
	/** The angle in the vine's own frame that points down the screen, which beans hang toward */
	hang?: number;
	/** Beans grow to this share of their full length */
	podSize?: number;
	/** Leaves thin out and shrink toward the tip, leaving its last stretch bare */
	trailing?: boolean;
}

/**
 * Lays out a vine growing down a column of the given height. The stem shape and
 * leaf placement depend only on the seed, so a taller column extends the same vine.
 */
export function growVine(
	height: number,
	seed: number,
	{ hang = 90, podSize = 1, trailing = false }: VineOptions = {}
): Vine {
	const rand = mulberry32(seed);
	const between = (lo: number, hi: number) => lo + rand() * (hi - lo);

	const cx = VINE_WIDTH / 2;
	const p1 = between(0, Math.PI * 2);
	const p2 = between(0, Math.PI * 2);
	const sway = (y: number) =>
		cx + 3.5 * Math.sin((y / 110) * Math.PI * 2 + p1) + 1.5 * Math.sin((y / 47) * Math.PI * 2 + p2);

	const [thick, thin] = [1.6, 0.6];
	const left: string[] = [];
	const right: string[] = [];
	for (let y = 0; ; y = Math.min(y + 4, height)) {
		const half = thick + (thin - thick) * (height ? y / height : 0);
		const x = sway(y);
		left.push(`${r1(x - half)} ${r1(y)}`);
		right.unshift(`${r1(x + half)} ${r1(y)}`);
		if (y >= height) break;
	}
	const stem = `M${left.join(' L')} L${right.join(' L')} Z`;

	// How far toward the tip, and how much a trailing vine has thinned out there
	const reach = (y: number) => (height ? y / height : 0);
	const thinning = (y: number) => (trailing ? Math.pow(reach(y), 1.4) : 0);

	const leaves: Leaf[] = [];
	let side = rand() < 0.5 ? 1 : -1;
	const leafEnd = trailing ? height * 0.82 : height - 6;
	for (
		let y = between(6, 14);
		y < leafEnd;
		// A trailing vine starts out bushier than a plain one, then thins toward the tip
		y += between(14, 22) * (trailing ? 0.55 + 3.5 * thinning(y) : 1)
	) {
		if (rand() > 0.15) side = -side;
		const lift = between(20, 55);
		const length = between(17, 23) * (1 - 0.45 * thinning(y));
		leaves.push({
			x: r1(sway(y)),
			y: r1(y),
			angle: Math.round(side > 0 ? -lift : 180 + lift),
			length: r1(length),
			width: r1(length * between(0.42, 0.54)),
			tone: rand() < 0.3 ? 1 : 0,
			under: false
		});
	}


	// Own stream, so the beans leave the stem and its leaves where they were
	const pick = mulberry32(seed ^ 0x5bd1e995);
	const within = (lo: number, hi: number) => lo + pick() * (hi - lo);
	const beans: Bean[] = [];
	let beanSide = pick() < 0.5 ? 1 : -1;
	// Beans hanging down the vine need their full length of vine left below them
	// and a trailing vine only fruits on its leafy first half
	const room = hang === 90 ? podSize * 60 : 8;
	const beanEnd = trailing ? height * 0.5 : height - room;
	for (let y = within(20, 36); y < beanEnd; y += within(60, 95)) {
		beanSide = -beanSide;
		// Beans often hang in pairs from one node, splayed a little apart
		const count = pick() < 0.4 ? 2 : 1;
		for (let i = 0; i < count; i++) {
			const splay = i === 0 ? beanSide * within(4, 14) : -beanSide * within(2, 10);
			const x = r1(sway(y));
			const angle = Math.round(hang + splay);
			const length = podSize * within(i ? 40 : 46, i ? 50 : 58);
			// A leaf whose base the bean crosses tucks under it, whichever layer the bean hangs in
			for (const leaf of leaves) if (overLeafBase(leaf, x, y, angle, length)) leaf.under = true;
			beans.push({
				x,
				y: r1(y),
				angle,
				front: pick() < 0.5,
				...growPod(within, length)
			});
		}
	}

	return { stem, leaves, beans };
}

/** Whether a pod hanging from (x, y) at `angle` lies across where a leaf leaves its stalk. */
function overLeafBase(leaf: Leaf, x: number, y: number, angle: number, length: number): boolean {
	const toRad = Math.PI / 180;
	// The blade starts a short stalk out from the stem
	const bx = leaf.x + Math.cos(leaf.angle * toRad) * 3.5 - x;
	const by = leaf.y + Math.sin(leaf.angle * toRad) * 3.5 - y;
	const ux = Math.cos(angle * toRad);
	const uy = Math.sin(angle * toRad);
	const along = Math.max(0, Math.min(length, bx * ux + by * uy));
	return Math.hypot(bx - ux * along, by - uy * along) < length * 0.05 + 3;
}

/**
 * A long slender pod: a short stalk and leafy cap, a body that swells over each seed
 * and runs in a gentle S, then thins to the wispy string the bean is named for.
 */
function growPod(within: (lo: number, hi: number) => number, length: number): Pod {
	const stalk = length * 0.06;
	const half = length * within(0.045, 0.055);
	const seeds = Math.round(within(5, 7));
	const bow = length * within(-0.07, 0.07);
	const wave = length * within(-0.025, 0.025);
	const span = length - stalk;

	const centre = (s: number) => ({
		x: stalk + s * span,
		y: bow * Math.sin(s * Math.PI) + wave * Math.sin(s * Math.PI * 2)
	});
	// Full almost at once behind the cap, steady down the length, drawn to a point at the end
	const profile = (s: number) =>
		Math.sqrt(Math.min(1, s / 0.05)) * (s < 0.82 ? 1 : Math.pow((1 - s) / 0.18, 0.8));
	// Each seed presses the pod out a little
	const swell = (s: number) => 0.9 + 0.12 * Math.pow(Math.abs(Math.sin(s * seeds * Math.PI)), 0.6);

	const upper: string[] = [];
	const lower: string[] = [];
	const highlight: string[] = [];
	const seam: string[] = [];
	const steps = 48;
	for (let i = 0; i <= steps; i++) {
		const s = i / steps;
		const { x, y } = centre(s);
		const w = half * profile(s) * swell(s);
		upper.push(`${r1(x)} ${r1(y - w)}`);
		lower.unshift(`${r1(x)} ${r1(y + w)}`);
		if (s > 0.08 && s < 0.78) highlight.push(`${r1(x)} ${r1(y - w * 0.45)}`);
		if (s > 0.04 && s < 0.86) seam.push(`${r1(x)} ${r1(y + w * 0.62)}`);
	}

	const base = centre(0);
	const end = centre(1);
	const flick = within(-1, 1) * half * 2;
	const cap = [-1, 1, 0]
		.map((side) => {
			const reach = stalk + half * (side ? 1.6 : 2);
			return `M${r1(stalk * 0.6)} 0 Q${r1(stalk + half)} ${r1(side * half * 1.4)} ${r1(reach)} ${r1(side * half * 0.5)} Q${r1(stalk + half * 0.6)} ${r1(side * half * 0.2)} ${r1(stalk * 0.6)} 0 Z`;
		})
		.join(' ');

	return {
		stalk: `M0 0 L${r1(base.x)} ${r1(base.y)}`,
		cap,
		body: `M${upper.join(' L')} L${lower.join(' L')} Z`,
		highlight: `M${highlight.join(' L')}`,
		seam: `M${seam.join(' L')}`,
		tail: `M${r1(end.x)} ${r1(end.y)} Q${r1(end.x + length * 0.05)} ${r1(end.y + flick * 0.3)} ${r1(end.x + length * 0.08)} ${r1(end.y + flick)}`
	};
}

/** Leaf outline with its base at the origin, pointing along +x. */
export function leafPath({ length: l, width: w }: Leaf): string {
	return `M0 0 Q${r1(l * 0.45)} ${-w} ${l} 0 Q${r1(l * 0.55)} ${r1(w * 0.9)} 0 0 Z`;
}

export function midribPath({ length: l, width: w }: Leaf): string {
	return `M0.8 0 Q${r1(l * 0.5)} ${r1(-w * 0.15)} ${r1(l * 0.85)} 0`;
}

/** A side root, drawn from where it leaves the taproot at (x, y). */
export interface Rootlet {
	x: number;
	y: number;
	path: string;
}

export interface Roots {
	taproot: string;
	rootlets: Rootlet[];
}

type Point = [number, number];

/** A filled outline around a line of points, `from` wide at its start and `to` at its end. */
function taper(points: Point[], from: number, to: number): string {
	const upper: string[] = [];
	const lower: string[] = [];
	points.forEach(([x, y], i) => {
		const [px, py] = points[Math.max(0, i - 1)];
		const [nx, ny] = points[Math.min(points.length - 1, i + 1)];
		const len = Math.hypot(nx - px, ny - py) || 1;
		const half = from + (to - from) * (i / (points.length - 1));
		const ox = (-(ny - py) / len) * half;
		const oy = ((nx - px) / len) * half;
		upper.push(`${r1(x + ox)} ${r1(y + oy)}`);
		lower.unshift(`${r1(x - ox)} ${r1(y - oy)}`);
	});
	return `M${upper.join(' L')} L${lower.join(' L')} Z`;
}

/** A wandering line from the origin, heading `angle` degrees and slowly turning down. */
function wander(
	between: (lo: number, hi: number) => number,
	length: number,
	angle: number,
	start: Point = [0, 0]
): Point[] {
	const points: Point[] = [start];
	let [x, y] = start;
	let heading = angle;
	for (let walked = 0; walked < length; walked += 2) {
		heading += between(-12, 12);
		// Roots are drawn downward as they spread
		heading += (90 - heading) * 0.06;
		x += Math.cos((heading * Math.PI) / 180) * 2;
		y += Math.sin((heading * Math.PI) / 180) * 2;
		points.push([x, y]);
	}
	return points;
}

/**
 * Lays out roots growing down a column of the given height: a wandering taproot with
 * side roots that spread, fork and thin out, shorter the deeper they start.
 */
export function growRoots(height: number, seed: number): Roots {
	const rand = mulberry32(seed);
	const between = (lo: number, hi: number) => lo + rand() * (hi - lo);

	const cx = VINE_WIDTH / 2;
	const p1 = between(0, Math.PI * 2);
	const p2 = between(0, Math.PI * 2);
	const sway = (y: number) =>
		cx + 2.5 * Math.sin((y / 70) * Math.PI * 2 + p1) + 1.5 * Math.sin((y / 29) * Math.PI * 2 + p2);

	const spine: Point[] = [];
	for (let y = 0; ; y = Math.min(y + 4, height)) {
		spine.push([sway(y), y]);
		if (y >= height) break;
	}

	const rootlets: Rootlet[] = [];
	let side = rand() < 0.5 ? 1 : -1;
	for (let y = between(6, 12); y < height - 10; y += between(12, 22)) {
		if (rand() > 0.2) side = -side;
		const depth = height ? y / height : 0;
		const length = between(12, 26) * (1 - 0.5 * depth);
		// Out from the taproot and down, steeper on one side than the other
		const angle = 90 - side * between(40, 72);
		const main = wander(between, length, angle);
		const width = 1 - 0.45 * depth;
		const parts = [taper(main, width, 0.12)];
		// Some roots fork part way along
		if (rand() < 0.45 && main.length > 6) {
			const at = Math.floor(main.length * between(0.4, 0.65));
			const fork = wander(between, length * between(0.35, 0.55), angle + side * between(20, 35), main[at]);
			parts.push(taper(fork, width * 0.5, 0.1));
		}
		rootlets.push({ x: r1(sway(y)), y: r1(y), path: parts.join(' ') });
	}

	return { taproot: taper(spine, 1.7, 0.3), rootlets };
}
