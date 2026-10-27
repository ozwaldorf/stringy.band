<script lang="ts" module>
	// Headings that share a name across pages share their sprigs too, for the length of a visit
	const seeds = new Map<string, number>();
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import VineDrawing from './VineDrawing.svelte';

	let {
		label,
		level = 'h1',
		page = false,
		name
	}: {
		label: string;
		level?: 'h1' | 'h2';
		/** A page's own title: larger and darker, and focusable so a route change can land on it */
		page?: boolean;
		/** Shared with the matching heading on another page, so it morphs across a route change */
		name?: string;
	} = $props();

	// A fresh pair of sprigs each visit, picked once when the heading mounts
	const seed = untrack(() => {
		const fresh = Math.floor(Math.random() * 2 ** 32);
		if (!name) return fresh;
		if (!seeds.has(name)) seeds.set(name, fresh);
		return seeds.get(name)!;
	});
	// Mounted mid page change, the sprigs start grown so the heading morphs cleanly
	const grown = document.documentElement.classList.contains('swapping');
</script>

<svelte:element this={page ? 'h1' : level} class="section-heading" class:page tabindex={page ? -1 : undefined} style:view-transition-name={name}>
	<span class="sprig"><VineDrawing sideways trailing length={190} {seed} {grown} /></span>
	<span class="label">{label}</span>
	<span class="sprig right"><VineDrawing sideways trailing length={190} seed={seed + 1} {grown} /></span>
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
