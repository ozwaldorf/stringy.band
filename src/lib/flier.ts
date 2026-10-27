import { TIME_ZONE, type Show } from './bandsintown.ts';

export type FlierFields = {
	venue: string;
	address: string;
	time: string;
	date: string;
	entry: string;
	tagline: string;
	link: string;
};

export type Palette = {
	name: string;
	bg: string;
	text: string;
	accent: string;
	shadow: string;
	// The logo's greens, retuned so it stands off this field
	logo: LogoTint;
	// The QR code's colour straight on the field, where a dark shade looks heavy
	qrBare?: string;
};

// The logo art's own greens and what each tint swaps them for
export type LogoTint = 'original' | 'bright' | 'light' | 'glow';

const LOGO_GREENS = {
	line: ['#17411e'],
	fill: ['#24a148'],
	deep: ['#175121', 'rgb(0% 20.796% 2.1377%)'],
	mid: ['#307e35', '#2d8337'],
	light: ['#7ece6b', '#77c864']
};

const LOGO_TINTS: Record<Exclude<LogoTint, 'original'>, Record<keyof typeof LOGO_GREENS, string>> = {
	// Lifted, for darker and blue green fields
	bright: { line: '#123a19', fill: '#3fc25f', deep: '#1f7a33', mid: '#3a9a44', light: '#a6e38f' },
	// Paler still, for green fields, keeping the dark outline for an edge
	light: { line: '#17411e', fill: '#52bd62', deep: '#2b8239', mid: '#47a64f', light: '#b4e4a2' },
	// Bright greens with a mid green outline: darker than the fill, light enough to show on a near black field
	glow: { line: '#165a26', fill: '#3fc25f', deep: '#1f7a33', mid: '#3a9a44', light: '#d2f0c2' }
};

export function tintLogo(svg: string, tint: LogoTint): string {
	if (tint === 'original') return svg;
	for (const [part, colors] of Object.entries(LOGO_GREENS) as [keyof typeof LOGO_GREENS, string[]][]) {
		for (const color of colors) svg = svg.split(color).join(LOGO_TINTS[tint][part]);
	}
	return svg;
}

// Light ones set dark type
export const isLight = (palette: Palette) => contrast(palette.text, '#000000') < contrast(palette.text, '#ffffff');

export const PALETTES: Palette[] = [
	// Light fields with dark type, lightest first
	{ name: 'Cream', bg: '#fbf1c7', text: '#3c3836', accent: '#9d0006', shadow: 'rgba(60, 56, 54, 0.25)', logo: 'original' },
	{ name: 'Butter', bg: '#f4dc93', text: '#3c3836', accent: '#9d0006', shadow: 'rgba(60, 56, 54, 0.25)', logo: 'original' },
	{ name: 'Lilac', bg: '#d8c4dc', text: '#3c3836', accent: '#8f3f71', shadow: 'rgba(60, 56, 54, 0.25)', logo: 'original' },
	// Dark fields with light type, lightest first
	{ name: 'Sage', bg: '#6f9c5e', text: '#fbf1c7', accent: '#fbf1c7', shadow: 'rgba(0, 0, 0, 0.3)', logo: 'light', qrBare: '#fbf1c7' },
	{ name: 'Rose', bg: '#c26592', text: '#fbf1c7', accent: '#fbf1c7', shadow: 'rgba(0, 0, 0, 0.3)', logo: 'original', qrBare: '#fbf1c7' },
	{ name: 'Teal', bg: '#3d8a85', text: '#fbf1c7', accent: '#fbf1c7', shadow: 'rgba(0, 0, 0, 0.35)', logo: 'bright', qrBare: '#fbf1c7' },
	{ name: 'Clay', bg: '#a5563a', text: '#fbf1c7', accent: '#fabd2f', shadow: 'rgba(0, 0, 0, 0.35)', logo: 'original' },
	{ name: 'Slate', bg: '#4c6470', text: '#fbf1c7', accent: '#fabd2f', shadow: 'rgba(0, 0, 0, 0.4)', logo: 'bright' },
	{ name: 'Blue', bg: '#076678', text: '#fbf1c7', accent: '#fabd2f', shadow: 'rgba(0, 0, 0, 0.4)', logo: 'bright' },
	{ name: 'Night', bg: '#3a2f26', text: '#fbf1c7', accent: '#fe8019', shadow: 'rgba(0, 0, 0, 0.5)', logo: 'glow' },
	{ name: 'Ink', bg: '#25313d', text: '#ebdbb2', accent: '#fe8019', shadow: 'rgba(0, 0, 0, 0.6)', logo: 'glow' },
	{ name: 'Dark', bg: '#282828', text: '#ebdbb2', accent: '#fabd2f', shadow: 'rgba(0, 0, 0, 0.6)', logo: 'glow' }
];

// Fallback module colours; the light ones suit dark fields, which phone cameras read inverted
const QR_STOCK = ['#175121', '#076678', '#282828', '#fbf1c7', '#ffffff'];

// Phone cameras want strong contrast between modules and what is behind them
const QR_MIN_CONTRAST = 4.5;

function channels(hex: string): number[] {
	return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function luminance(hex: string): number {
	const [r, g, b] = channels(hex).map((c) => {
		const v = c / 255;
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

export function shade(hex: string, amount: number): string {
	return `#${channels(hex)
		.map((c) => Math.round(c * (1 - amount)).toString(16).padStart(2, '0'))
		.join('')}`;
}

// A shade of the flier's own colour where it reads on `behind`, else the most legible fallback
export function qrColor(palette: Palette, behind: string): string {
	if (behind === palette.bg && palette.qrBare) return palette.qrBare;
	const candidates = [0.55, 0.7, 0.85].map((amount) => shade(palette.bg, amount)).concat(palette.accent, QR_STOCK);
	return (
		candidates.find((fg) => contrast(fg, behind) >= QR_MIN_CONTRAST) ??
		candidates.reduce((best, fg) => (contrast(fg, behind) > contrast(best, behind) ? fg : best))
	);
}

// `null` draws the code straight on the field colour
export const QR_TILES: { name: string; bg: string | null }[] = [
	{ name: 'Cream', bg: '#fbf1c7' },
	{ name: 'None', bg: null }
];

// `tile` is drawn behind the code; null leaves it on whatever the layout puts there
// How far apart two colours look, weighting the channels the way eyes do
function colorDistance([r1, g1, b1]: number[], [r2, g2, b2]: number[]): number {
	const mean = (r1 + r2) / 2;
	return Math.sqrt((2 + mean / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - mean) / 256) * (b1 - b2) ** 2);
}

// Palettes ordered by how well their base or accent picks up `tone`, closest first
export function palettesFor(tone: [number, number, number]): Palette[] {
	const score = (p: Palette) => Math.min(colorDistance(tone, channels(p.bg)), colorDistance(tone, channels(p.accent)) * 1.15);
	return [...PALETTES].sort((a, b) => score(a) - score(b));
}

export type QrStyle = { tile: string | null };

function zoned(options: Intl.DateTimeFormatOptions) {
	return new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, ...options });
}

const hourFmt = zoned({ hour: 'numeric', minute: '2-digit', hour12: true });

function hourParts(d: Date): { time: string; period: string } {
	const [time, period] = hourFmt.format(d).split(' ');
	return { time: time.replace(/:00$/, ''), period };
}

// "8-11PM", "7:30PM-12AM", or "8PM" with no end
export function formatTimeRange(start: Date, end: Date): string {
	const a = hourParts(start);
	if (end.getTime() <= start.getTime()) return `${a.time}${a.period}`;
	const b = hourParts(end);
	return a.period === b.period ? `${a.time}-${b.time}${b.period}` : `${a.time}${a.period}-${b.time}${b.period}`;
}

// The letters after a day: st, nd, rd or th
export const ordinalSuffix = (n: number) => ordinal(n).slice(String(n).length);

function ordinal(n: number): string {
	const rem100 = n % 100;
	if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
	return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

const weekdayFmt = zoned({ weekday: 'long' });
const monthFmt = zoned({ month: 'long' });
const dayFmt = zoned({ day: 'numeric' });

// "Friday, August 21st", at the venue
export function formatFlierDate(d: Date): string {
	return `${weekdayFmt.format(d)}, ${monthFmt.format(d)} ${ordinal(+dayFmt.format(d))}`;
}

// The street on one line and the town on the next, as the printed fliers have it
export function addressLines(show: Pick<Show, 'fullAddress' | 'cityState'>): string {
	const full = show.fullAddress ?? '';
	const at = show.cityState ? full.lastIndexOf(show.cityState) : -1;
	if (at <= 0) return full;
	return `${full.slice(0, at).replace(/[,\s]+$/, ',')}\n${full.slice(at)}`;
}

export function flierFields(show: Show): FlierFields {
	return {
		venue: show.venue || show.summary,
		address: addressLines(show),
		time: formatTimeRange(show.start, show.end),
		date: formatFlierDate(show.start),
		entry: 'Free entry',
		tagline: '',
		link: `https://stringy.band/#${show.anchor}`
	};
}

const slug = (text: string) =>
	text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

// The UTM tags a flier's QR code carries
// Kept short, since every character packs the QR code tighter: "nov11-opening-for"
export function qrCampaign(fields: Pick<FlierFields, 'venue' | 'date'>): string {
	const day = fields.date.match(/([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2})/);
	const when = day ? `${day[1].toLowerCase()}${day[2]}` : slug(fields.date);
	// As many whole words of the venue as fit in 18 characters, or the first word cut short
	const words = slug(fields.venue).split('-').filter(Boolean);
	let where = '';
	for (const word of words) {
		const next = where ? `${where}-${word}` : word;
		if (next.length > 18) break;
		where = next;
	}
	if (!where && words.length) where = words[0].slice(0, 18);
	return [when, where].filter(Boolean).join('-') || 'flier';
}

export const qrTags = (fields: Pick<FlierFields, 'venue' | 'date'>) => ({
	utm_source: 'flier',
	utm_medium: 'qr',
	utm_campaign: qrCampaign(fields)
});

// The QR code's link, tagged so scans show up as this flier in analytics; left alone if not a web link
export function qrLink(fields: Pick<FlierFields, 'link' | 'venue' | 'date'>): string {
	const link = fields.link.trim();
	let url: URL;
	try {
		url = new URL(link);
	} catch {
		return link;
	}
	if (!/^https?:$/.test(url.protocol)) return link;
	for (const [key, value] of Object.entries(qrTags(fields))) url.searchParams.set(key, value);
	return url.toString();
}

export function flierFilename(fields: Pick<FlierFields, 'venue' | 'date'>): string {
	return `stringy-${slug(`${fields.date} ${fields.venue}`) || 'flier'}.png`;
}
