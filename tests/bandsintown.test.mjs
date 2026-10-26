import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fetchShows, toShow } from '../src/lib/bandsintown.ts';

function event(overrides) {
	return {
		id: '109081525',
		url: 'https://www.bandsintown.com/e/109081525?app_id=secret',
		datetime: '2026-11-11T20:00:00',
		starts_at: '2026-11-11T20:00:00',
		ends_at: '2026-11-11T21:00:00',
		title: 'Opening for Garrett Boys',
		description: '',
		venue: {
			name: 'Opening for Garrett Boys',
			street_address: '675 River St',
			city: 'Troy',
			region: 'NY',
			postal_code: '12180',
			country: 'United States'
		},
		offers: [],
		...overrides
	};
}

test('converts venue-local times to UTC across daylight saving', () => {
	const winter = toShow(event());
	assert.equal(winter.start.toISOString(), '2026-11-12T01:00:00.000Z');
	assert.equal(winter.end.toISOString(), '2026-11-12T02:00:00.000Z');
	const summer = toShow(event({ datetime: '2026-07-11T19:00:00', starts_at: '', ends_at: '' }));
	assert.equal(summer.start.toISOString(), '2026-07-11T23:00:00.000Z');
	assert.equal(summer.end.toISOString(), summer.start.toISOString());
});

test('maps venue and address fields', () => {
	const show = toShow(event());
	assert.equal(show.uid, '109081525');
	assert.equal(show.anchor, 'show-109081525');
	assert.equal(show.summary, 'Opening for Garrett Boys');
	assert.equal(show.fullAddress, '675 River St, Troy, NY 12180');
	assert.equal(show.simpleAddress, '675 River St, Troy, NY');
	assert.equal(show.cityState, 'Troy, NY');
	assert.equal(show.location, '675 River St, Troy, NY 12180, USA');
	assert.equal(toShow(event({ title: '' })).summary, 'Opening for Garrett Boys');
});

test('takes tickets from offers and details and fliers from the description', () => {
	const description = 'Details: https://venue.example/show Flier: https://www.instagram.com/p/abc/.';
	const show = toShow(event({ description, offers: [{ type: 'Tickets', url: 'https://www.bandsintown.com/t/1?app_id=secret' }] }));
	assert.equal(show.tickets, 'https://www.bandsintown.com/t/109081525');
	assert.equal(show.url, 'https://venue.example/show');
	assert.equal(show.instagram, 'https://www.instagram.com/p/abc/');
	const bare = toShow(event());
	assert.equal(bare.tickets, undefined);
	assert.equal(bare.url, 'https://www.bandsintown.com/e/109081525');
	assert.equal(toShow(event({ offers: [{ type: 'Tickets' }] })).url, undefined);
	assert.equal(toShow(event({ description: 'https://www.instagram.com/p/abc/' })).url, undefined);
});

test('requests every event for the artist', async (t) => {
	const urls = [];
	t.mock.method(globalThis, 'fetch', async (url) => {
		urls.push(url);
		return Response.json([event()]);
	});
	const shows = await fetchShows('key');
	assert.equal(shows.length, 1);
	assert.match(urls[0], /\/artists\/id_15672469\/events\?app_id=key&date=all$/);
});
