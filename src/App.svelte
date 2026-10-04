<script lang="ts">
	import { tick } from 'svelte';
	import Home from './Home.svelte';
	import Shop from './Shop.svelte';
	import NotFound from './NotFound.svelte';

	let path = $state(window.location.pathname.replace(/\/+$/, '') || '/');

	async function updatePath() {
		path = window.location.pathname.replace(/\/+$/, '') || '/';
		await tick();
		window.scrollTo(0, 0);
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
			if (url.hash || (url.pathname === window.location.pathname && url.search === window.location.search)) return;

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
{:else if path === '/shop' || path.startsWith('/shop/')}
	<Shop handle={path.slice('/shop'.length).replace(/^\//, '')} />
{:else}
	<NotFound />
{/if}
