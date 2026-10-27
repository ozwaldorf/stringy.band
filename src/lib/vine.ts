export const VINE_WIDTH = 44;

export interface Leaf {
	x: number;
	y: number;
	angle: number;
	length: number;
	width: number;
	tone: number;
	stub: boolean;
}

export interface Vine {
	stem: string;
	leaves: Leaf[];
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

/**
 * Lays out a vine growing down a column of the given height. The stem shape and
 * leaf placement depend only on the seed, so a taller column extends the same vine.
 */
export function growVine(height: number, seed: number, dry = false): Vine {
	const rand = mulberry32(seed);
	const between = (lo: number, hi: number) => lo + rand() * (hi - lo);

	const cx = VINE_WIDTH / 2;
	const p1 = between(0, Math.PI * 2);
	const p2 = between(0, Math.PI * 2);
	const sway = (y: number) =>
		cx + 3.5 * Math.sin((y / 110) * Math.PI * 2 + p1) + 1.5 * Math.sin((y / 47) * Math.PI * 2 + p2);

	const [thick, thin] = dry ? [1.3, 0.5] : [1.6, 0.6];
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

	const leaves: Leaf[] = [];
	let side = rand() < 0.5 ? 1 : -1;
	for (let y = between(6, 14); y < height - 6; y += dry ? between(22, 34) : between(18, 28)) {
		if (rand() > 0.15) side = -side;
		const lift = dry ? between(-35, 25) : between(20, 55);
		const length = dry ? between(9, 13) : between(11, 16);
		leaves.push({
			x: r1(sway(y)),
			y: r1(y),
			angle: Math.round(side > 0 ? -lift : 180 + lift),
			length: r1(length),
			width: r1(length * between(0.42, 0.54)),
			tone: rand() < 0.3 ? 1 : 0,
			stub: dry && rand() < 0.2
		});
	}

	return { stem, leaves };
}

/** Leaf outline with its base at the origin, pointing along +x. */
export function leafPath({ length: l, width: w }: Leaf): string {
	return `M0 0 Q${r1(l * 0.45)} ${-w} ${l} 0 Q${r1(l * 0.55)} ${r1(w * 0.9)} 0 0 Z`;
}

export function midribPath({ length: l, width: w }: Leaf): string {
	return `M0.8 0 Q${r1(l * 0.5)} ${r1(-w * 0.15)} ${r1(l * 0.85)} 0`;
}
