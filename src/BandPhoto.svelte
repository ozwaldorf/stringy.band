<script lang="ts">
	import { fade } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';

	let {
		photos,
		index,
		sideways = false,
		onpick,
		element = $bindable(),
		class: className = '',
		style = ''
	}: {
		photos: { src: string; caption: string }[];
		index: number;
		sideways?: boolean;
		onpick?: () => void;
		element?: HTMLElement;
		class?: string;
		style?: string;
	} = $props();

	const duration = $derived(prefersReducedMotion.current ? 0 : 600);

	// Fetch the next photo early so the swap never shows a blank frame
	$effect(() => {
		new Image().src = photos[(index + 1) % photos.length].src;
	});
</script>

<figure class="band-photo note {className}" class:sideways {style} bind:this={element}>
	{#if onpick}
		<button class="pick" aria-label="Pick up photo: {photos[index].caption}" onclick={onpick}></button>
	{/if}
	<div class="frame">
		{#key index}
			<img src={photos[index].src} alt={photos[index].caption} transition:fade={{ duration }} />
		{/key}
	</div>
	<figcaption>
		{#key index}
			<span transition:fade={{ duration }}>{photos[index].caption}</span>
		{/key}
	</figcaption>
</figure>

<style>
	.band-photo {
		position: relative;
		box-sizing: border-box;
		margin: 0;
		padding: var(--pad, 0.75rem) var(--pad, 0.75rem) calc(var(--pad, 0.75rem) * 3.3);
		transform: rotate(var(--tilt, 1.5deg));
		transition:
			transform 200ms ease,
			box-shadow 200ms ease;
		--pull-scale: 1.04;
	}

	/* Pulled a little off the page under the pointer, ahead of being picked up */
	.band-photo:has(> .pick:hover),
	.band-photo:has(> .pick:focus-visible) {
		z-index: 3;
		transform: translateY(-0.35rem) rotate(var(--tilt, 1.5deg)) scale(var(--pull-scale));
		box-shadow:
			0 2px 4px rgba(60, 56, 54, 0.15),
			0 14px 28px rgba(60, 56, 54, 0.2);
	}

	@media (prefers-reduced-motion: reduce) {
		.band-photo {
			transition: none;
		}
	}

	/* The same print turned on its side: the wide strip runs down the right */
	.sideways {
		padding: var(--pad, 0.75rem) calc(var(--pad, 0.75rem) * 3.3) var(--pad, 0.75rem) var(--pad, 0.75rem);
	}

	.sideways .frame {
		aspect-ratio: 3 / 4;
	}

	/* Handwritten on the wide strip; old and new captions share one cell while they fade */
	figcaption {
		position: absolute;
		left: var(--pad, 0.75rem);
		right: var(--pad, 0.75rem);
		bottom: 0;
		height: calc(var(--pad, 0.75rem) * 3.3);
		display: grid;
		place-items: center;
		container-type: size;
		font-family: var(--font-hand);
		color: var(--gb-fg1);
	}

	/* Shrinks to the strip's length (about 19em fits the longest caption), then wraps */
	figcaption span {
		grid-area: 1 / 1;
		max-width: 100%;
		font-size: clamp(0.65rem, 100cqmax / 19, 0.95rem);
		line-height: 1.3;
		text-align: center;
		text-wrap: balance;
		transform: rotate(-1deg);
	}

	.sideways figcaption {
		left: auto;
		right: 0;
		top: var(--pad, 0.75rem);
		bottom: var(--pad, 0.75rem);
		width: calc(var(--pad, 0.75rem) * 3.3);
		height: auto;
		writing-mode: vertical-rl;
	}

	/* Covers the whole print so a click anywhere on it picks it up */
	.pick {
		position: absolute;
		inset: 0;
		z-index: 2;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
	}

	.pick:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 4px;
	}

	/* Reads bottom to top, like writing along the strip with the print turned back upright */
	.sideways figcaption span {
		transform: rotate(179deg);
	}

	.frame {
		position: relative;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		background: var(--gb-bg1);
	}

	/* Vignette over whichever photo is showing, and a shadow where it sits under the border */
	.frame::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 1;
		background: radial-gradient(ellipse at center, transparent 55%, rgba(40, 28, 16, 0.35) 100%);
		box-shadow:
			inset 0 2px 4px rgba(40, 28, 16, 0.45),
			inset 0 0 1px rgba(40, 28, 16, 0.5),
			inset 0 0 1.5rem rgba(40, 28, 16, 0.25);
		pointer-events: none;
	}

	/* Pinned to the frame so a photo never sizes it, even while loading */
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
