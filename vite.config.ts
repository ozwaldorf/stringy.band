import { svelte } from '@sveltejs/vite-plugin-svelte';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Icons from 'unplugin-icons/vite';
import { defineConfig, type Plugin } from 'vite';
import { parseIcal } from './src/lib/ical';

const ICAL_URL =
	'https://calendar.google.com/calendar/ical/c_7504b3e06e2470e78978542a5c985ab63b1520ebc3edc14db2555be3a0aece55%40group.calendar.google.com/public/basic.ics';
const SHOWS_OUT = resolve('src/lib/shows.json');

function fetchShows(): Plugin {
	async function run() {
		try {
			const res = await fetch(ICAL_URL);
			if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
			const shows = parseIcal(await res.text())
				.sort((a, b) => a.start.getTime() - b.start.getTime())
				.map((s) => ({ ...s, start: s.start.toISOString(), end: s.end.toISOString() }));
			mkdirSync(dirname(SHOWS_OUT), { recursive: true });
			writeFileSync(
				SHOWS_OUT,
				JSON.stringify({ fetchedAt: new Date().toISOString(), shows }, null, 2) + '\n'
			);
			console.log(`[fetch-shows] wrote ${shows.length} shows`);
		} catch (err) {
			console.warn(`[fetch-shows] failed: ${(err as Error).message}`);
			mkdirSync(dirname(SHOWS_OUT), { recursive: true });
			writeFileSync(SHOWS_OUT, JSON.stringify({ fetchedAt: null, shows: [] }, null, 2) + '\n');
		}
	}

	return {
		name: 'fetch-shows',
		buildStart: run,
		configureServer: run
	};
}

function spa404(): Plugin {
	return {
		name: 'spa-fallback-404',
		apply: 'build',
		closeBundle() {
			const out = resolve('build');
			copyFileSync(resolve(out, 'index.html'), resolve(out, '404.html'));
		}
	};
}

export default defineConfig({
	plugins: [fetchShows(), svelte(), Icons({ compiler: 'svelte' }), spa404()],
	build: {
		outDir: 'build'
	}
});
