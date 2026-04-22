export type Show = {
	uid: string;
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
};

export function parseIcal(source: string): Show[] {
	const unfolded = source.replace(/\r?\n[ \t]/g, '');
	const lines = unfolded.split(/\r?\n/);

	const shows: Show[] = [];
	let current: Record<string, string> | null = null;

	for (const line of lines) {
		if (line === 'BEGIN:VEVENT') {
			current = {};
			continue;
		}
		if (line === 'END:VEVENT') {
			if (current) shows.push(toShow(current));
			current = null;
			continue;
		}
		if (!current) continue;

		const colon = line.indexOf(':');
		if (colon < 0) continue;
		const rawKey = line.slice(0, colon);
		const value = line.slice(colon + 1);
		const key = rawKey.split(';')[0];
		current[key] = value;
	}

	return shows;
}

function toShow(fields: Record<string, string>): Show {
	const description = fields.DESCRIPTION ? unescape(fields.DESCRIPTION) : undefined;
	const location = fields.LOCATION ? unescape(fields.LOCATION) : undefined;
	const { venue, fullAddress, simpleAddress, cityState } = splitLocation(location);

	return {
		uid: fields.UID ?? crypto.randomUUID(),
		start: parseDate(fields.DTSTART),
		end: parseDate(fields.DTEND ?? fields.DTSTART),
		summary: unescape(fields.SUMMARY ?? ''),
		location,
		venue,
		fullAddress,
		simpleAddress,
		cityState,
		description,
		url: extractUrl(description)
	};
}

function unescape(value: string): string {
	return value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

function parseDate(value: string): Date {
	const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
	if (!m) return new Date(NaN);
	const [, y, mo, d, hh = '0', mm = '0', ss = '0', z] = m;
	if (z === 'Z') {
		return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss));
	}
	return new Date(+y, +mo - 1, +d, +hh, +mm, +ss);
}

function splitLocation(location?: string): {
	venue?: string;
	fullAddress?: string;
	simpleAddress?: string;
	cityState?: string;
} {
	if (!location) return {};
	const parts = location.split(',').map((s) => s.trim());
	if (parts.length === 1) return { venue: parts[0] };

	const addressParts = parts.slice(1);
	const last = addressParts[addressParts.length - 1];
	if (addressParts.length > 1 && /^[A-Za-z][A-Za-z. ]{1,24}$/.test(last)) {
		addressParts.pop();
	}
	const stripped = addressParts.map((p) => p.replace(/\s+\d{5}(?:-\d{4})?$/, ''));

	return {
		venue: parts[0],
		fullAddress: addressParts.join(', '),
		simpleAddress: stripped.join(', '),
		cityState: stripped.length >= 2 ? stripped.slice(1).join(', ') : undefined
	};
}

function extractUrl(description?: string): string | undefined {
	if (!description) return;
	const href = description.match(/href="([^"]+)"/i);
	if (href) return href[1];
	const bare = description.match(/https?:\/\/[^\s<>"]+/);
	return bare?.[0];
}
