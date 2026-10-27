<script lang="ts">
	import VineDrawing from './VineDrawing.svelte';

	let { label, level = 'h1' }: { label: string; level?: 'h1' | 'h2' } = $props();

	// A fresh pair of sprigs each visit
	const seed = Math.floor(Math.random() * 2 ** 32);
</script>

<svelte:element this={level} class="section-heading">
	<span class="sprig"><VineDrawing sideways trailing length={190} {seed} /></span>
	<span class="label">{label}</span>
	<span class="sprig right"><VineDrawing sideways trailing length={190} seed={seed + 1} /></span>
</svelte:element>

<style>
	.section-heading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		align-self: center;
		max-width: 100%;
		margin: 0 0 var(--section-heading-gap);
		font-size: var(--section-heading);
		letter-spacing: 0.14em;
		color: var(--color-text-subtle);
	}

	/* Letter spacing trails the last letter too, which would widen the right-hand gap */
	.label {
		flex: none;
		margin-right: -0.14em;
	}

	/* Thick end against the words; on narrow screens the thin tip is trimmed first */
	.sprig {
		flex: 0 1 5.2em;
		min-width: 0;
		height: 1.2em;
	}

	.sprig :global(svg) {
		width: 100%;
		height: 100%;
	}

	.right {
		transform: scaleX(-1);
	}
</style>
