<script lang="ts">
	import { tick } from 'svelte';
	import Home from './Home.svelte';
	import Shop from './Shop.svelte';
	import Flier from './Flier.svelte';
	import NotFound from './NotFound.svelte';
	import { glideTo } from './lib/scroll';

	let path = $state(window.location.pathname.replace(/\/+$/, '') || '/');

	async function updatePath() {
		const next = window.location.pathname.replace(/\/+$/, '') || '/';
		// Same-page history steps keep the browser's own scroll restoration
		if (next === path) return;
		const swap = async () => {
			path = next;
			await tick();
			const target = window.location.hash && document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
			if (target) target.scrollIntoView({ behavior: 'instant' });
			// Instant, or the page's smooth scrolling would carry on after the swap
			else window.scrollTo({ top: 0, behavior: 'instant' });
			// Pages that draw by scroll position (Home's docked logo) catch up before the capture,
			// rather than on a scroll event that may come after it
			window.dispatchEvent(new Event('route-morph'));
		};
		// Where the browser can, pieces both pages share (the merch title, each product
		// card) morph from one page to the other while the rest crossfades
		if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
			const root = document.documentElement;
			// 'swapping' lasts the transition; 'morphed' stays, so the page-in fade (theme.css)
			// is left to the first load and never restarts when a transition ends
			// 'route-morph' lets a page redraw anything that should morph differently (Home's logo)
			root.classList.add('swapping', 'morphed');
			window.dispatchEvent(new Event('route-morph'));
			const transition = document.startViewTransition(swap);
			void transition.finished.finally(() => {
				root.classList.remove('swapping');
				window.dispatchEvent(new Event('route-morph'));
			});
			await transition.updateCallbackDone;
		} else {
			await swap();
		}
		document.querySelector<HTMLElement>('main h1[tabindex], main[tabindex]')?.focus({ preventScroll: true });
	}

	$effect(() => {
		const onPopState = () => { void updatePath(); };
		window.addEventListener('popstate', onPopState);

		const onClick = (event: MouseEvent) => {
			if (event.defaultPrevented || event.button !== 0) return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

			const anchor = (event.target as HTMLElement | null)?.closest('a');
			if (!anchor) return;

			const href = anchor.getAttribute('href');
			if (!href) return;
			if (anchor.target && anchor.target !== '_self') return;
			if (anchor.hasAttribute('download')) return;

			const url = new URL(anchor.href, window.location.href);
			if (url.origin !== window.location.origin) return;
			if (url.pathname === window.location.pathname && url.search === window.location.search) {
				if (!url.hash) return;
				event.preventDefault();
				if (url.hash !== window.location.hash) window.history.pushState({}, '', url);
				glideTo(decodeURIComponent(url.hash.slice(1)));
				return;
			}

			event.preventDefault();
			window.history.pushState({}, '', url);
			void updatePath();
		};
		document.addEventListener('click', onClick);

		return () => {
			window.removeEventListener('popstate', onPopState);
			document.removeEventListener('click', onClick);
		};
	});
</script>

{#if path === '/'}
	<Home />
{:else if path === '/flier'}
	<Flier />
{:else if path === '/shop' || path.startsWith('/shop/')}
	<Shop handle={path.slice('/shop'.length).replace(/^\//, '')} />
{:else}
	<NotFound />
{/if}
