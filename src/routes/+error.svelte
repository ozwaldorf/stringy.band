<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} - Stringy and the Beans</title>
</svelte:head>

<main>
	<h1>{page.status}</h1>
	<p>{page.error?.message ?? 'Page not found'}</p>
	<a href="/">Back home</a>
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2rem;
		text-align: center;
	}

	h1 {
		margin: 0;
		font-size: 4rem;
		color: var(--color-text-muted);
	}

	p {
		margin: 0;
		color: var(--color-text-subtle);
	}
</style>
