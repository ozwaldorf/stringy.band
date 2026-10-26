import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildJsonLd, jsonLdScript } from '../src/lib/jsonld.ts';

const now = Date.parse('2026-06-01T00:00:00Z');

function show(overrides) {
	return {
		uid: 'a@google.com',
		anchor: 'show-a',
		start: '2026-06-10T23:00:00.000Z',
		end: '2026-06-11T01:00:00.000Z',
		summary: 'Quarters Headliner',
		location: 'Quarters, 183 Ballston Ave, Saratoga Springs, NY 12866, USA',
		venue: 'Quarters',
		fullAddress: '183 Ballston Ave, Saratoga Springs, NY 12866',
		...overrides
	};
}

test('emits the band and upcoming shows with a structured address', () => {
	const graph = buildJsonLd([show({ uid: 'past', end: '2026-05-01T00:00:00.000Z' }), show()], now)['@graph'];
	assert.equal(graph.length, 2);
	assert.equal(graph[0]['@type'], 'MusicGroup');
	const event = graph[1];
	assert.equal(event['@type'], 'MusicEvent');
	assert.equal(event.startDate, '2026-06-10T23:00:00.000Z');
	assert.deepEqual(event.performer, { '@id': graph[0]['@id'] });
	assert.deepEqual(event.location, {
		'@type': 'Place',
		name: 'Quarters',
		address: {
			'@type': 'PostalAddress',
			streetAddress: '183 Ballston Ave',
			addressLocality: 'Saratoga Springs',
			addressRegion: 'NY',
			postalCode: '12866',
			addressCountry: 'US'
		}
	});
});

test('falls back to plain addresses and skips shows without a location', () => {
	const graph = buildJsonLd([
		show({ location: 'Somewhere, Troy', venue: 'Somewhere', fullAddress: 'Troy' }),
		show({ uid: 'b', location: undefined, venue: undefined, fullAddress: undefined })
	], now)['@graph'];
	assert.equal(graph.length, 2);
	assert.equal(graph[1].location.address, 'Troy');
});

test('escapes markup in the embedded script', () => {
	const html = jsonLdScript({ name: '</script><b>' });
	assert.ok(!html.slice(0, -'</script>'.length).includes('</script>'));
});

test('links to the info page, then the flier, then the show on the homepage', () => {
	const urls = buildJsonLd([
		show({ url: 'https://venue.example/show', instagram: 'https://www.instagram.com/p/x/' }),
		show({ instagram: 'https://www.instagram.com/p/x/' }),
		show()
	], now)['@graph'].slice(1).map((event) => event.url);
	assert.deepEqual(urls, ['https://venue.example/show', 'https://www.instagram.com/p/x/', 'https://stringy.band/#show-a']);
});
