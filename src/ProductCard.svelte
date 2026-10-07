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

<a class="product" href={`/shop/${product.handle}`} bind:this={card} onpointerenter={() => (hovered = true)} onpointerleave={() => (hovered = false)} onfocusin={() => (focused = true)} onfocusout={() => (focused = false)}>
	<div class="image">
		{#key previewImage}
			<img src={previewImage} alt="" width="422" height="422" loading="lazy" transition:fade={{ duration: prefersReducedMotion.current ? 0 : 320 }} />
		{/key}
		{#if colors.length > 1}
			<div class="colors" role="img" aria-label={`Colors: ${colors.map(color => color.name).join(', ')}`}>
				{#each colors as color (color.name)}
					<span class:current={preview?.name === color.name} title={color.name}><ColorSwatch swatches={color.swatches} compact /></span>
				{/each}
			</div>
		{/if}
	</div>
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
	}

	.image {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		background: var(--color-bg-subtle);
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
		transition: transform 150ms ease;
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
		right: 0.5rem;
		bottom: 0.5rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
		max-width: calc(100% - 1rem);
		padding: 0.3rem 0.4rem;
		box-sizing: border-box;
		border: 1px solid var(--color-border-subtle);
		border-radius: 999px;
		background: var(--color-bg);
	}

	.colors > span { display: block; border-radius: 50%; }
	.colors > span.current { outline: 1px solid var(--color-accent); outline-offset: 2px; }

	.product-meta :global(svg) {
		color: var(--color-link);
		flex-shrink: 0;
		transition: transform 150ms ease;
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

	.product:hover img {
		transform: scale(1.025);
	}

	.product:hover .product-meta :global(svg) {
		transform: translateX(3px);
	}

	@media (prefers-reduced-motion: reduce) {
		img, .product-meta :global(svg) { transition: none; }
		.product:hover img { transform: none; }
		.product:hover .product-meta :global(svg) { transform: none; }
	}
</style>
