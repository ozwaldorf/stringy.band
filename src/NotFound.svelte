<script lang="ts">
	import ShopNotice from './ShopNotice.svelte';
	import Footer from './Footer.svelte';
	import './lib/styles/shop.css';
</script>

<svelte:head><title>404 - Stringy and the Beans</title></svelte:head>

<div class="not-found">
	<main>
		<h1 tabindex="-1">404</h1>
		<ShopNotice title="Page not found" message="This page is not available. Head back to the band for music, shows, and merch." actionLabel="Back home" actionHref="/" />
	</main>
	<Footer />
</div>

<style>
	.not-found {
		min-height: 100dvh;
		max-width: 42rem;
		margin: auto;
		padding: 2rem;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 1rem;
	}

	h1 {
		margin: 0;
		font-size: 4rem;
		color: var(--color-text-muted);
		text-align: center;
	}
</style>
