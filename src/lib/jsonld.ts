import type { Show } from './bandsintown';

const SITE_URL = 'https://stringy.band/';

type ShowJson = Omit<Show, 'start' | 'end'> & { start: string; end: string };

const GROUP_ID = `${SITE_URL}#band`;

const musicGroup = {
	'@type': 'MusicGroup',
	'@id': GROUP_ID,
	name: 'Stringy and the Beans',
	description: 'Bluegrass Quintet from Upstate NY',
	genre: 'Bluegrass',
	url: SITE_URL,
	logo: `${SITE_URL}logo.svg`,
	image: `${SITE_URL}preview.png`,
	email: 'beans@stringy.band',
	sameAs: [
		'https://www.instagram.com/stringyandthebeans',
		'https://www.facebook.com/profile.php?id=61567240809186',
		'https://www.youtube.com/@stringyandthebeans',
		'https://www.tiktok.com/@stringyandthebeans',
		'https://www.bandsintown.com/a/15672469'
	]
};

function postalAddress(show: ShowJson): string | Record<string, string> | undefined {
	if (!show.fullAddress) return show.location;
	const parts = show.fullAddress.split(',').map((s) => s.trim());
	const region = parts[parts.length - 1].match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
	if (!region || parts.length < 3) return show.fullAddress;
	const country = show.location?.split(',').pop()?.trim();
	return {
		'@type': 'PostalAddress',
		streetAddress: parts.slice(0, -2).join(', '),
		addressLocality: parts[parts.length - 2],
		addressRegion: region[1],
		postalCode: region[2],
		...(country === 'USA' ? { addressCountry: 'US' } : {})
	};
}

function musicEvent(show: ShowJson) {
	return {
		'@type': 'MusicEvent',
		name: show.summary.trim(),
		startDate: show.start,
		endDate: show.end,
		eventStatus: 'https://schema.org/EventScheduled',
		eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
		url: show.url ?? show.tickets ?? show.instagram ?? `${SITE_URL}#${show.anchor}`,
		image: `${SITE_URL}preview.png`,
		performer: { '@id': GROUP_ID },
		location: { '@type': 'Place', name: show.venue ?? show.location, address: postalAddress(show) },
		...(show.tickets
			? { offers: { '@type': 'Offer', url: show.tickets, availability: 'https://schema.org/InStock' } }
			: {})
	};
}

export function buildJsonLd(shows: ShowJson[], now = Date.now()) {
	return {
		'@context': 'https://schema.org',
		'@graph': [
			musicGroup,
			...shows.filter((s) => new Date(s.end).getTime() >= now && s.location).map(musicEvent)
		]
	};
}

export function jsonLdScript(data: unknown): string {
	return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
