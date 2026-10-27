export type Show = {
	uid: string;
	anchor: string;
	start: Date;
	end: Date;
	summary: string;
	location?: string;
	venue?: string;
	fullAddress?: string;
	simpleAddress?: string;
	cityState?: string;
	description?: string;
	url?: string;
	tickets?: string;
	instagram?: string;
};

type Event = {
	id: string;
	datetime: string;
	starts_at?: string;
	ends_at?: string;
	title?: string;
	description?: string;
	venue: {
		name?: string;
		street_address?: string;
		city?: string;
		region?: string;
		postal_code?: string;
		country?: string;
	};
	offers?: unknown[];
};

export const ARTIST_ID = '15672469';

// The API reports venue-local times without an offset; every venue so far is Eastern
const TIME_ZONE = 'America/New_York';

export async function fetchShows(appId: string): Promise<Show[]> {
	const res = await fetch(
		`https://rest.bandsintown.com/artists/id_${ARTIST_ID}/events?app_id=${encodeURIComponent(appId)}&date=all`
	);
	if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
	return ((await res.json()) as Event[]).map(toShow);
}

export function toShow(event: Event): Show {
	const { name, street_address: street, city, region, country } = event.venue;
	// The API drops leading zeros from US ZIP codes (05255 -> 5255)
	const postal =
		country === 'United States' && /^\d{3,4}$/.test(event.venue.postal_code ?? '')
			? event.venue.postal_code!.padStart(5, '0')
			: event.venue.postal_code;
	const cityState = [city, region].filter(Boolean).join(', ') || undefined;
	const simpleAddress = [street, cityState].filter(Boolean).join(', ') || undefined;
	const fullAddress = simpleAddress && postal ? `${simpleAddress} ${postal}` : simpleAddress;
	const description = event.description || undefined;
	const start = zonedDate(event.starts_at || event.datetime);
	const tickets = event.offers?.length ? `https://www.bandsintown.com/t/${event.id}` : undefined;
	const instagram = extractInstagram(description);

	return {
		uid: event.id,
		anchor: `show-${event.id.replace(/[^A-Za-z0-9_-]/g, '')}`,
		start,
		end: event.ends_at ? zonedDate(event.ends_at) : start,
		summary: (event.title || name || '').trim(),
		location: fullAddress && country === 'United States' ? `${fullAddress}, USA` : fullAddress,
		venue: name,
		fullAddress,
		simpleAddress,
		cityState,
		description,
		url:
			extractUrl(description) ??
			(tickets || instagram ? undefined : `https://www.bandsintown.com/e/${event.id}`),
		// Redirects to the ticket seller; the API's own link embeds the app id
		tickets,
		instagram
	};
}

function zonedDate(local: string): Date {
	const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
	if (!m) return new Date(NaN);
	const [, y, mo, d, hh, mm, ss = '0'] = m;
	const wall = Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss);
	let utc = wall;
	for (let i = 0; i < 2; i++) utc = wall - (zonedWall(utc) - utc);
	return new Date(utc);
}

function zonedWall(utc: number): number {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone: TIME_ZONE,
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric'
		})
			.formatToParts(utc)
			.map((p) => [p.type, +p.value])
	);
	return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function extractUrl(description?: string): string | undefined {
	if (!description) return;
	const hrefs = [...description.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
	const nonIgHref = hrefs.find((u) => !isInstagramUrl(u));
	if (nonIgHref) return nonIgHref;
	const bares = [...description.matchAll(/https?:\/\/[^\s<>"]+/g)].map((m) => m[0]);
	return bares.find((u) => !isInstagramUrl(u));
}

function isInstagramUrl(url: string): boolean {
	return /^https?:\/\/(?:www\.)?instagram\.com\//i.test(url);
}

function extractInstagram(description?: string): string | undefined {
	if (!description) return;
	const match = description.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s<>"]+/i);
	return match?.[0].replace(/[).,;:!?]+$/, '');
}
