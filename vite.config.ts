import { svelte } from '@sveltejs/vite-plugin-svelte';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Icons from 'unplugin-icons/vite';
import { defineConfig, type Plugin } from 'vite';
import { fetchShows as loadShows } from './src/lib/bandsintown';
import { buildJsonLd, jsonLdScript } from './src/lib/jsonld';
import { fetchProducts as loadProducts, withProductPage, type Product } from './src/lib/fourthwall';
import { fetchProductPage } from './src/lib/product-page';
import { CHANNEL_ID, feedUrl, latestVideos, parseFeed } from './src/lib/youtube';

const SHOWS_OUT = resolve('src/lib/shows.json');
const VIDEOS_OUT = resolve('src/lib/videos.json');
const PRODUCTS_OUT = resolve('src/lib/products.json');

function fetchShows(): Plugin {
	async function run() {
		try {
			const appId = process.env.BANDSINTOWN_APP_ID;
			if (!appId) throw new Error('BANDSINTOWN_APP_ID is not set');
			const shows = (await loadShows(appId))
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

// The deployed copy of the last good video list, used when YouTube's feed is down
const VIDEOS_FALLBACK = 'https://stringy.band/videos.json';

function fetchVideos(): Plugin {
	async function fetchFeed() {
		let error: Error | undefined;
		for (let attempt = 0; attempt < 3; attempt++) {
			if (attempt) await new Promise((r) => setTimeout(r, 2000 * attempt));
			try {
				const res = await fetch(feedUrl(CHANNEL_ID));
				if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
				return latestVideos(parseFeed(await res.text()));
			} catch (err) {
				error = err as Error;
			}
		}
		throw error;
	}

	// The local file from an earlier run, else the deployed copy
	async function lastGood(): Promise<{ fetchedAt: string | null; videos: unknown[] }> {
		try {
			const local = JSON.parse(readFileSync(VIDEOS_OUT, 'utf8'));
			if (local.videos?.length) return local;
		} catch {
			// No earlier run
		}
		try {
			const res = await fetch(VIDEOS_FALLBACK);
			if (res.ok) {
				const deployed = await res.json();
				if (deployed.videos?.length) return deployed;
			}
		} catch {
			// Not deployed yet
		}
		return { fetchedAt: null, videos: [] };
	}

	async function run() {
		let data;
		try {
			data = { fetchedAt: new Date().toISOString(), videos: await fetchFeed() };
			console.log(`[fetch-videos] wrote ${data.videos.length} videos`);
		} catch (err) {
			data = await lastGood();
			console.warn(`[fetch-videos] failed: ${(err as Error).message}; kept ${data.videos.length} earlier videos`);
		}
		mkdirSync(dirname(VIDEOS_OUT), { recursive: true });
		writeFileSync(VIDEOS_OUT, JSON.stringify(data, null, 2) + '\n');
	}

	return {
		name: 'fetch-videos',
		buildStart: run,
		configureServer: run,
		// Publish the list so a later build can fall back to it
		generateBundle() {
			this.emitFile({ type: 'asset', fileName: 'videos.json', source: readFileSync(VIDEOS_OUT, 'utf8') });
		}
	};
}

function jsonLd(): Plugin {
	return {
		name: 'json-ld',
		transformIndexHtml(html) {
			const { shows } = JSON.parse(readFileSync(SHOWS_OUT, 'utf8'));
			return html.replace('</head>', () => `\t${jsonLdScript(buildJsonLd(shows))}\n\t</head>`);
		}
	};
}

function spa404(): Plugin {
	return {
		name: 'spa-fallback-404',
		apply: 'build',
		closeBundle() {
			const out = resolve('build');
			const source = readFileSync(resolve(out, 'index.html'), 'utf8')
				.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, '');
			writeFileSync(resolve(out, '404.html'), source);
			const { products } = JSON.parse(readFileSync(PRODUCTS_OUT, 'utf8')) as {
				products: { handle: string; title: string }[];
			};
			const routes = [
				{ path: 'shop', title: 'Shop' },
				{ path: 'shop/bag', title: 'Your bag' },
				{ path: 'flier', title: 'Flier generator' },
				...products.map((product) => {
					const handle = encodeURIComponent(product.handle);
					if (!handle || handle === '.' || handle === '..' || handle === 'bag') {
						throw new Error('Invalid shop product route');
					}
					return { path: `shop/${handle}`, title: product.title };
				})
			];
			const escapeHtml = (value: string) => value
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;');
			for (const route of routes) {
				const title = escapeHtml(`${route.title} - Stringy and the Beans`);
				const url = escapeHtml(`https://stringy.band/${route.path}/`);
				const html = source
					.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${title}</title>`)
					.replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/, () => `<link rel="canonical" href="${url}" />`)
					.replace(/<meta\b(?=[^>]*\bproperty=["']og:url["'])[^>]*>/, () => `<meta property="og:url" content="${url}" />`)
					.replace(/<meta\b(?=[^>]*\bproperty=["']og:title["'])[^>]*>/, () => `<meta property="og:title" content="${title}" />`)
					.replace(/<meta\b(?=[^>]*\bname=["']twitter:title["'])[^>]*>/, () => `<meta name="twitter:title" content="${title}" />`);
				mkdirSync(resolve(out, route.path), { recursive: true });
				writeFileSync(resolve(out, route.path, 'index.html'), html);
			}
		}
	};
}

function fetchProducts(): Plugin {
	async function run() {
		let previousProducts: Product[] = [];
		try {
			const snapshot = JSON.parse(readFileSync(PRODUCTS_OUT, 'utf8'));
			if (Array.isArray(snapshot.products)) previousProducts = snapshot.products;
		} catch {}
		try {
			const products = await Promise.all((await loadProducts()).map(async product => {
				try {
					return withProductPage(product, await fetchProductPage(product));
				} catch (err) {
					console.warn(`[fetch-products] page ${product.handle}: ${(err as Error).message}`);
					return withProductPage(product, previousProducts.find(item => item.id === product.id));
				}
			}));
			mkdirSync(dirname(PRODUCTS_OUT), { recursive: true });
			writeFileSync(
				PRODUCTS_OUT,
				JSON.stringify({ fetchedAt: new Date().toISOString(), products }, null, 2) + '\n'
			);
			console.log(`[fetch-products] wrote ${products.length} products`);
		} catch (err) {
			console.warn(`[fetch-products] failed: ${(err as Error).message}`);
			try {
				if (Array.isArray(JSON.parse(readFileSync(PRODUCTS_OUT, 'utf8')).products)) return;
			} catch {}
			mkdirSync(dirname(PRODUCTS_OUT), { recursive: true });
			writeFileSync(PRODUCTS_OUT, JSON.stringify({ fetchedAt: null, products: [] }, null, 2) + '\n');
		}
	}

	return {
		name: 'fetch-products',
		buildStart: run,
		configureServer: run
	};
}

export default defineConfig({
	plugins: [fetchShows(), fetchVideos(), fetchProducts(), jsonLd(), svelte(), Icons({ compiler: 'svelte' }), spa404()],
	build: {
		outDir: 'build'
	}
});
