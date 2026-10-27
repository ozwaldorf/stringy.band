<script lang="ts">
	import VineDrawing from './VineDrawing.svelte';

	let {
		label,
		level = 'h1',
		page = false
	}: {
		label: string;
		level?: 'h1' | 'h2';
		/** A page's own title: larger and darker, and focusable so a route change can land on it */
		page?: boolean;
	} = $props();

	// A fresh pair of sprigs each visit
	const seed = Math.floor(Math.random() * 2 ** 32);
</script>

<svelte:element this={page ? 'h1' : level} class="section-heading" class:page tabindex={page ? -1 : undefined}>
	<span class="sprig"><VineDrawing sideways trailing length={190} {seed} /></span>
	<span class="label">{label}</span>
	<span class="sprig right"><VineDrawing sideways trailing length={190} seed={seed + 1} /></span>
</svelte:element>

<style>
	.section-heading {
		--tracking: 0.14em;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		align-self: center;
		max-width: 100%;
		margin: 0 0 var(--section-heading-gap);
		font-size: var(--section-heading);
		letter-spacing: var(--tracking);
		color: var(--color-text-subtle);
	}

	.page {
		--tracking: 0.08em;
		font-size: clamp(1.5rem, 3vw, 2rem);
		color: var(--color-text);
	}

	/* Letter spacing trails the last letter too, which would widen the right-hand gap */
	.label {
		flex: none;
		margin-right: calc(-1 * var(--tracking));
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
