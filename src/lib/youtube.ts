export type Video = {
	id: string;
	title: string;
	published?: string;
};

export const CHANNEL_ID = 'UC2maoxYCDVtGugDA7rCn7nw';

export function feedUrl(channelId: string): string {
	return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

export function parseFeed(source: string): Video[] {
	const videos: Video[] = [];
	const entryRe = /<entry>([\s\S]*?)<\/entry>/g;

	let entry: RegExpExecArray | null;
	while ((entry = entryRe.exec(source))) {
		const body = entry[1];
		const id = body.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
		if (!id) continue;
		videos.push({
			id,
			title: unescapeXml(body.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
			published: body.match(/<published>([^<]+)<\/published>/)?.[1]
		});
	}

	return videos;
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
