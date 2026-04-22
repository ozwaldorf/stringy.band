<script lang="ts">
	import Home from './Home.svelte';
	import NotFound from './NotFound.svelte';

	let path = $state(window.location.pathname);

	$effect(() => {
		const onPopState = () => (path = window.location.pathname);
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

			event.preventDefault();
			if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
				window.history.pushState({}, '', url);
				path = url.pathname;
			}
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
{:else}
	<NotFound />
{/if}
