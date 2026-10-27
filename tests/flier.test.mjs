import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addressLines, contrast, flierFields, flierFilename, formatFlierDate, formatTimeRange, palettesFor, PALETTES, qrColor, qrLink } from '../src/lib/flier.ts';

// 8PM and 11PM Eastern
const start = new Date('2026-08-22T00:00:00Z');
const end = new Date('2026-08-22T03:00:00Z');

test('formats time ranges in venue time', () => {
	assert.equal(formatTimeRange(start, end), '8-11PM');
	assert.equal(formatTimeRange(start, start), '8PM');
	assert.equal(formatTimeRange(new Date('2026-08-21T23:30:00Z'), new Date('2026-08-22T04:00:00Z')), '7:30PM-12AM');
});

test('formats dates with ordinals at the venue', () => {
	assert.equal(formatFlierDate(start), 'Friday, August 21st');
	assert.equal(formatFlierDate(new Date('2026-08-12T00:00:00Z')), 'Tuesday, August 11th');
});

test('splits the street from the town', () => {
	assert.equal(
		addressLines({ fullAddress: '14 Phila Street, Saratoga Springs, NY 12866', cityState: 'Saratoga Springs, NY' }),
		'14 Phila Street,\nSaratoga Springs, NY 12866'
	);
	assert.equal(addressLines({ fullAddress: 'Troy, NY', cityState: 'Troy, NY' }), 'Troy, NY');
	assert.equal(addressLines({}), '');
});

test('prefills fields from a show', () => {
	const fields = flierFields({
		uid: '1',
		anchor: 'show-1',
		start,
		end,
		summary: 'Live at Harveys',
		venue: "Harvey's Bar & Restaurant",
		fullAddress: '14 Phila Street, Saratoga Springs, NY 12866',
		cityState: 'Saratoga Springs, NY'
	});
	assert.equal(fields.venue, "Harvey's Bar & Restaurant");
	assert.equal(fields.time, '8-11PM');
	assert.equal(fields.date, 'Friday, August 21st');
	assert.equal(fields.link, 'https://stringy.band/#show-1');
	assert.equal(flierFilename(fields), 'stringy-friday-august-21st-harvey-s-bar-restaurant.png');
});

test('picks a QR colour that reads on what is behind it', () => {
	for (const palette of PALETTES) {
		// A bare field colour set by hand is a deliberate choice
		for (const behind of ['#fbf1c7', '#ffffff', ...(palette.qrBare ? [] : [palette.bg])]) {
			const fg = qrColor(palette, behind);
			assert.ok(contrast(fg, behind) >= 4.5, `${palette.name} on ${behind}: ${fg}`);
		}
	}
});

test('tags the QR link for analytics', () => {
	const fields = { link: 'https://stringy.band/#show-1', venue: "Harvey's Bar", date: 'Friday, August 21st' };
	assert.equal(
		qrLink(fields),
		'https://stringy.band/?utm_source=flier&utm_medium=qr&utm_campaign=aug21-harvey-s-bar#show-1'
	);
	assert.equal(qrLink({ ...fields, link: 'not a url' }), 'not a url');
	assert.equal(qrLink({ ...fields, link: 'mailto:band@stringy.band' }), 'mailto:band@stringy.band');
});

test('ranks palettes by how well they pick up a photo tone', () => {
	assert.equal(palettesFor([61, 138, 133])[0].name, 'Teal');
	assert.equal(palettesFor([250, 240, 200])[0].name, 'Cream');
	assert.equal(palettesFor([40, 40, 40])[0].name, 'Dark');
});
