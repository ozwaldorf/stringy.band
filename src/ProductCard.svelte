<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { productPrice, type Product } from './lib/fourthwall';
	import IconArrowRight from '~icons/carbon/arrow-right';
	import ColorSwatch from './ColorSwatch.svelte';
	import { productOptions } from './lib/product-options';

	let { product }: { product: Product } = $props();
	let card = $state<HTMLAnchorElement>();
	let visible = $state(false);
	let hovered = $state(false);
	let focused = $state(false);
	let previewName = $state('');
	const colors = $derived(productOptions(product)?.colors ?? []);
	const previews = $derived(colors.flatMap(color => color.images?.[0] ? [{ name: color.name, image: color.images[0] }] : []));
	const preview = $derived(previews.find(color => color.name === previewName) ?? previews[0]);
	const previewImage = $derived(colors.length > 1 && preview ? preview.image : product.image);

	// Stable per-product scatter so each note sits a little differently
	const scatter = $derived.by(() => {
		let seed = 0;
		for (const char of product.handle) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
		const next = (min: number, max: number) => {
			seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
			return min + (seed / 2 ** 32) * (max - min);
		};
		return [
			`--tilt: ${next(-1.5, 1.5).toFixed(2)}deg`,
			`--shift-x: ${next(-4, 4).toFixed(1)}px`,
			`--shift-y: ${next(-4, 4).toFixed(1)}px`,
			`--tape-tilt: ${next(-5, 5).toFixed(1)}deg`,
			`--tear-shift: ${next(0, 25).toFixed(1)}rem`,
			`--tear-tile: ${next(19, 31).toFixed(1)}rem`
		].join('; ');
	});

	$effect(() => {
		if (!card) return;
		const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
		observer.observe(card);
		return () => observer.disconnect();
	});

	$effect(() => {
		const frames = previews;
		if (frames.length < 2 || !visible || hovered || focused || prefersReducedMotion.current) return;
		let active = true;
		let loading = false;
		const timer = setInterval(async () => {
			if (document.hidden || loading) return;
			loading = true;
			const next = frames[(Math.max(0, frames.findIndex(color => color.name === previewName)) + 1) % frames.length];
			const image = new Image();
			image.src = next.image;
			try {
				await image.decode();
				if (active && !document.hidden) previewName = next.name;
			} catch {
				// Keep the current preview if the next image cannot load.
			} finally {
				loading = false;
			}
		}, 4000);
		return () => { active = false; clearInterval(timer); };
	});
</script>

<a class="product note torn" href={`/shop/${product.handle}`} style={scatter} bind:this={card} onpointerenter={() => (hovered = true)} onpointerleave={() => (hovered = false)} onfocusin={() => (focused = true)} onfocusout={() => (focused = false)}>
	<span class="paper plain" aria-hidden="true"></span>
	<div class="image">
		{#key previewImage}
			<img src={previewImage} alt="" width="422" height="422" loading="lazy" transition:fade={{ duration: prefersReducedMotion.current ? 0 : 320 }} />
		{/key}
	</div>
	{#if colors.length > 1}
		<div class="colors" role="img" aria-label={`Colors: ${colors.map(color => color.name).join(', ')}`}>
			{#each colors as color (color.name)}
				<span class:current={preview?.name === color.name} title={color.name}><ColorSwatch swatches={color.swatches} compact /></span>
			{/each}
		</div>
	{/if}
	<h3>{product.title}</h3>
	<div class="product-meta">
		<p>{productPrice(product)}</p>
		{#if !product.available}<span class="availability">Sold out</span>{:else}<IconArrowRight aria-hidden="true" />{/if}
	</div>
</a>

<style>
	.product {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-width: 0;
		color: var(--color-text);
		text-decoration: none;
		text-align: left;
		height: 100%;
		/* Taped note with a torn bottom; smaller tape to suit the card */
		box-sizing: border-box;
		padding: 0.75rem 0.75rem 1rem;
		transform: translate(var(--shift-x, 0), var(--shift-y, 0)) rotate(var(--tilt, 0));
		transition: transform 150ms ease;
		--tape-width: 4.5rem;
	}

	.image {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		border-radius: 4px;
		box-sizing: border-box;
		padding: 0.5rem;
		overflow: hidden;
	}

	img {
		position: absolute;
		inset: 0.5rem;
		display: block;
		width: calc(100% - 1rem);
		height: calc(100% - 1rem);
		object-fit: contain;
	}

	h3 {
		flex: 1;
		margin: 0.8rem 0 0.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		text-transform: none;
		letter-spacing: 0;
		line-height: 1.45;
	}

	.product-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
	}

	.colors {
		position: absolute;
		z-index: 1;
		left: 0.4rem;
		top: 0.4rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
		max-width: calc(100% - 1rem);
		padding: 0.3rem 0.4rem;
		box-sizing: border-box;
		border: 1px solid var(--color-border-subtle);
		border-radius: 999px;
		background: var(--gb-bg0-h);
	}

	.colors > span { display: block; border-radius: 50%; }
	.colors > span.current { outline: 1px solid var(--color-accent); outline-offset: 2px; }

	.product-meta :global(svg) {
		color: var(--color-link);
		flex-shrink: 0;
	}

	p {
		margin: 0;
		color: var(--color-text);
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
	}

	.availability {
		font-size: 0.8rem;
		color: var(--color-text-subtle);
	}

	.product:hover h3 {
		color: var(--color-link-hover);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.product:hover {
		z-index: 1;
		transform: translate(var(--shift-x, 0), var(--shift-y, 0)) rotate(var(--tilt, 0)) scale(1.04);
	}

	@media (prefers-reduced-motion: reduce) {
		.product { transition: none; }
		.product:hover { transform: translate(var(--shift-x, 0), var(--shift-y, 0)) rotate(var(--tilt, 0)); }
	}
</style>
