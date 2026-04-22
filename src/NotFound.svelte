<script lang="ts">
	$effect(() => {
		const previous = document.title;
		document.title = '404 - Stringy and the Beans';
		return () => {
			document.title = previous;
		};
	});
</script>

<main>
	<h1>404</h1>
	<p>Page not found</p>
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
