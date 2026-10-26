export type Video = {
	id: string;
	title: string;
	published?: string;
	views?: number;
};

export const CHANNEL_ID = 'UC2maoxYCDVtGugDA7rCn7nw';

// The UULF uploads playlist holds only long-form videos, so the feed's
// 15-entry window isn't spent on Shorts
export function feedUrl(channelId: string): string {
	return `https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${channelId.replace(/^UC/, '')}`;
}

export function parseFeed(source: string): Video[] {
	const videos: Video[] = [];
	const entryRe = /<entry>([\s\S]*?)<\/entry>/g;

	let entry: RegExpExecArray | null;
	while ((entry = entryRe.exec(source))) {
		const body = entry[1];
		const id = body.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
		if (!id || /<link rel="alternate" href="[^"]*\/shorts\//.test(body)) continue;
		videos.push({
			id,
			title: unescapeXml(body.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
			published: body.match(/<published>([^<]+)<\/published>/)?.[1],
			views: Number(body.match(/<media:statistics views="(\d+)"/)?.[1] ?? 0)
		});
	}

	return videos;
}

const DAY_MS = 86_400_000;

// The most recent videos, ranked by views per day since upload
export function latestVideos(videos: Video[], limit = 10, now = Date.now()): Video[] {
	// Floored at a minute so a just-published video doesn't divide by zero
	const age = (v: Video) => Math.max(1 / 1440, (now - Date.parse(v.published ?? '')) / DAY_MS);
	const score = (v: Video) => (v.views ?? 0) / age(v) || 0;
	return videos
		.toSorted((a, b) => (b.published ?? '').localeCompare(a.published ?? ''))
		.slice(0, limit)
		.sort((a, b) => score(b) - score(a));
}

function unescapeXml(value: string): string {
	return value
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&')
		.trim();
}
