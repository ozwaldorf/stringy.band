import assert from 'node:assert/strict';
import { test } from 'node:test';

import { latestVideos, parseFeed } from '../src/lib/youtube.ts';

function entry(id, published, path = `watch?v=${id}`) {
	return `<entry>
		<yt:videoId>${id}</yt:videoId>
		<title>Song ${id} &amp; more</title>
		<link rel="alternate" href="https://www.youtube.com/${path}"/>
		<published>${published}</published>
		<media:group><media:community><media:statistics views="42"/></media:community></media:group>
	</entry>`;
}

test('skips shorts and reads view counts', () => {
	const feed = `<feed>
		<link rel="alternate" href="https://www.youtube.com/channel/UC1"/>
		${entry('a', '2026-10-02T00:00:00+00:00')}
		${entry('b', '2026-10-03T00:00:00+00:00', 'shorts/b')}
	</feed>`;
	assert.deepEqual(parseFeed(feed), [
		{ id: 'a', title: 'Song a & more', published: '2026-10-02T00:00:00+00:00', views: 42 }
	]);
});

test('keeps only the ten most recent videos', () => {
	const videos = Array.from({ length: 12 }, (_, i) => ({
		id: String(i),
		title: '',
		published: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00+00:00`,
		views: 10
	}));
	videos[0].views = 1000;
	const latest = latestVideos(videos, 10, Date.parse('2026-10-20T00:00:00Z'));
	assert.equal(latest.length, 10);
	assert.ok(!latest.some((v) => v.id === '0' || v.id === '1'));
});

test('ranks by views per day since upload', () => {
	const now = Date.parse('2026-10-31T00:00:00Z');
	const video = (id, day, views) => ({ id, title: '', published: `2026-10-${day}T00:00:00+00:00`, views });
	const ranked = latestVideos(
		[video('old', '01', 300), video('new', '29', 30), video('mid', '21', 50), video('fresh', '31', 0)],
		10,
		now
	);
	// 300 / 30 = 10, 30 / 2 = 15, 50 / 10 = 5, 0 / 0 = 0
	assert.deepEqual(ranked.map((v) => v.id), ['new', 'old', 'mid', 'fresh']);
});
