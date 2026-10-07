<script lang="ts">
	import { addToCart, cart } from './lib/cart';
	import { formatPrice, productPrice, type Variant } from './lib/fourthwall';
	import ProductSections from './ProductSections.svelte';
	import ColorSwatch from './ColorSwatch.svelte';
	import ShopNotice from './ShopNotice.svelte';
	import { optionVariant, productOptions, productSource, type ProductGroup } from './lib/product-options';

	let { product, initialHandle }: { product: ProductGroup; initialHandle: string } = $props();
	let variantId = $state('');
	let colorName = $state('');
	let sizeName = $state('');
	let message = $state('');
	let added = $state(false);
	let selectedPhoto = $state('');
	const options = $derived(productOptions(product));
	const initialColor = $derived(productSource(product, undefined, undefined, initialHandle).colors?.[0]?.name);
	const color = $derived(colorName ? options?.colors.find(color => color.name === colorName) : options?.colors.find(color => color.name === initialColor) ?? options?.colors[0]);
	const size = $derived(sizeName || (options?.sizes.length === 1 ? options.sizes[0] : ''));
	const selected = $derived(options ? optionVariant(options, color?.name ?? '', size) : product.variants.length === 1
		? product.variants[0]
		: product.variants.find((variant) => variant.id === variantId));
	const source = $derived(productSource(product, selected?.id, color?.name, initialHandle));
	const sourceColor = $derived(source.colors?.find(entry => entry.name === color?.name));
	const photos = $derived(sourceColor?.images?.length ? sourceColor.images : source.images?.length ? source.images : [source.image]);
	const photoIndex = $derived(Math.max(0, photos.indexOf(selectedPhoto)));
	const preloadedImages = new Map<string, HTMLImageElement>();

	$effect(() => {
		const urls = new Set(product.members.flatMap((member) => [
			member.image,
			...(member.images ?? []),
			...(member.colors ?? []).flatMap((entry) => entry.images ?? [])
		]));
		for (const url of urls) {
			if (preloadedImages.has(url)) continue;
			const image = new Image();
			image.decoding = 'async';
			image.fetchPriority = 'low';
			preloadedImages.set(url, image);
			image.src = url;
			void image.decode().catch(() => preloadedImages.delete(url));
		}
	});

	function isAvailable(variant: Variant | undefined): boolean {
		return !!variant && productSource(product, variant.id).available;
	}

	function resetFeedback() {
		message = '';
		added = false;
	}

	function selectColor(name: string) {
		if (!options) return;
		sizeName = optionVariant(options, name, size) ? size : '';
		colorName = name;
		selectedPhoto = '';
		resetFeedback();
	}

	$effect(() => {
		if (!added) return;
		const timeout = setTimeout(() => (added = false), 2000);
		return () => clearTimeout(timeout);
	});

	function add(event: SubmitEvent) {
		event.preventDefault();
		if (!selected || !isAvailable(selected) || added) return;
		if (($cart.find((item) => item.variantId === selected.id)?.quantity ?? 0) >= 99) {
			message = 'You already have the maximum quantity of this option in your bag.';
			return;
		}
		addToCart(selected.id);
		message = '';
		added = true;
	}
</script>

<div class="product-detail">
	<div class="gallery">
		<div class="product-image"><img src={photos[photoIndex]} alt={`${product.title}${color ? `, ${color.name}` : ''}, photo ${photoIndex + 1} of ${photos.length}`} width="422" height="422" /></div>
		{#if photos.length > 1}
			<div class="thumbnails" role="group" aria-label="Product photos">
				{#each photos as photo, index}
					<button class="thumbnail" type="button" aria-label={`Show ${product.title}, photo ${index + 1} of ${photos.length}`} aria-pressed={index === photoIndex} onclick={() => (selectedPhoto = photo)}>
						<img src={photo} alt="" width="56" height="56" loading="lazy" />
					</button>
				{/each}
			</div>
		{/if}
	</div>
	<div class="details">
		<h1 tabindex="-1">{product.title}</h1>
		<p class="price" aria-live="polite" aria-atomic="true">{selected ? formatPrice(selected.price, selected.currency) : productPrice(product)}</p>
		{#if product.available}
			<form onsubmit={add}>
				{#if options}
					<fieldset class:single-color={options.colors.length === 1}>
						<legend>Color<span>{color?.name ?? 'Choose a color'}</span></legend>
						{#if options.colors.length > 1}
							<div class="color-options">
								{#each options.colors as option (option.name)}
									<label class="color-option" title={option.name}>
										<input type="radio" name="product-color" value={option.name} checked={color?.name === option.name} aria-label={option.name} onchange={() => selectColor(option.name)} />
										<span><ColorSwatch swatches={option.swatches} /></span>
									</label>
								{/each}
							</div>
						{:else if !color}
							<button class="shop-button secondary" type="button" onclick={() => selectColor(options.colors[0].name)}>Select {options.colors[0].name}</button>
						{/if}
					</fieldset>
					<fieldset>
						<legend>Size</legend>
						<div class="options">
							{#each options.sizes as option (option)}
								{@const variant = optionVariant(options, color?.name ?? '', option)}
								<label class="option">
									<input type="radio" name="product-size" value={option} checked={!!variant && selected?.id === variant.id} disabled={!isAvailable(variant)} required aria-label={variant && isAvailable(variant) ? `${option}, ${formatPrice(variant.price, variant.currency)}` : `${option}, unavailable${color ? ` in ${color.name}` : ''}`} onchange={() => { colorName = color?.name ?? ''; sizeName = option; resetFeedback(); }} />
									<span>{option}</span>
								</label>
							{/each}
						</div>
					</fieldset>
				{:else if product.variants.length > 1}
					<fieldset>
						<legend>Option</legend>
						<div class="options">
							{#each product.variants as variant (variant.id)}
								<label class="option">
									<input type="radio" name="product-option" value={variant.id} bind:group={variantId} disabled={!isAvailable(variant)} required aria-label={`${variant.title}, ${formatPrice(variant.price, variant.currency)}`} onchange={resetFeedback} />
									<span>{variant.title}</span>
								</label>
							{/each}
						</div>
					</fieldset>
				{:else if selected}
					<p class="variant-title">{selected.title}</p>
				{/if}
				{#if color && !source.available}<ShopNotice title="Color unavailable" message="This color is currently sold out. Choose another color to continue." />{/if}
				<button class="shop-button" type="submit" disabled={!isAvailable(selected)} aria-disabled={added} aria-live="polite" aria-atomic="true">{added ? 'Added' : 'Add to bag'}</button>
			</form>
		{:else}
			<ShopNotice title="Sold out" message="This item is currently unavailable. Take a look at the other merch." actionLabel="Browse all merch" actionHref="/shop" />
		{/if}
		{#if message && product.available}<ShopNotice title="Quantity limit reached" {message} tone="warning" actionLabel="View bag" actionHref="/shop/bag" />{/if}
		<p class="checkout-note">Shipping, taxes, and final availability confirmed at checkout.</p>
		{#if source.sections?.length}<ProductSections sections={source.sections} />{/if}
	</div>
</div>

<style>
	.product-detail { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; gap: 2.5rem; max-width: 52rem; margin: auto; }
	.gallery { min-width: 0; }
	.product-image { background: var(--color-bg-subtle); border-radius: 2px; aspect-ratio: 1; }
	img { width: 100%; height: 100%; object-fit: contain; display: block; }
	.thumbnails { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.6rem; }
	.thumbnail { width: 3.5rem; height: 3.5rem; padding: 0.15rem; border: 2px solid transparent; border-radius: 2px; background: var(--color-bg-subtle); box-sizing: border-box; cursor: pointer; }
	.thumbnail:hover { border-color: var(--color-border); }
	.thumbnail[aria-pressed='true'] { border-color: var(--color-accent); }
	.thumbnail:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }
	.details { position: relative; padding: 0.2rem 0 0 1.5rem; box-sizing: border-box; }
	.details::before { content: ''; position: absolute; left: 0; top: 0.2rem; width: 0.9rem; height: 3rem; background: var(--floral-vine) top center / 100% 100% no-repeat; pointer-events: none; }
	h1 { margin: 0; font-size: clamp(1.25rem, 2.5vw, 1.55rem); text-transform: none; letter-spacing: -0.015em; line-height: 1.35; font-weight: 700; }
	.price { margin: 0.65rem 0 1.25rem; font-size: 1.05rem; font-variant-numeric: tabular-nums; }
	form { display: flex; flex-direction: column; align-items: flex-start; gap: 1rem; }
	fieldset { min-width: 0; width: 100%; margin: 0; padding: 0; border: 0; }
	legend { width: 100%; margin-bottom: 0.6rem; padding: 0; font-size: 0.8rem; font-weight: 600; }
	legend span { margin-left: 0.65rem; color: var(--color-text-muted); font-weight: 400; }
	.single-color legend { margin-bottom: 0; }
	.options { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.color-options { display: flex; flex-wrap: wrap; gap: 0.35rem; }
	.color-option { display: inline-flex; position: relative; cursor: pointer; }
	.color-option input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
	.color-option > span { display: flex; align-items: center; justify-content: center; width: 2.75rem; height: 2.75rem; border: 2px solid transparent; border-radius: 50%; box-sizing: border-box; }
	.color-option:hover > span { border-color: var(--color-border); }
	.color-option input:checked + span { border-color: var(--color-accent); }
	.color-option input:focus-visible + span { outline: 2px solid var(--color-accent); outline-offset: 3px; }
	.option { display: inline-flex; position: relative; cursor: pointer; font-size: 0.85rem; }
	.option input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
	.option > span { display: flex; align-items: center; justify-content: center; min-width: 2.75rem; min-height: 2.75rem; padding: 0.4rem 0.65rem; border: 1px solid var(--color-border); border-radius: 2px; box-sizing: border-box; color: var(--color-text); }
	.option:hover > span { background: var(--color-bg-subtle); border-color: var(--color-text-muted); }
	.option input:checked + span { color: var(--color-surface); background: var(--color-accent); border-color: var(--color-accent); }
	.option input:disabled { cursor: not-allowed; }
	.option input:disabled + span { opacity: 0.45; text-decoration: line-through; }
	.option input:focus-visible + span { outline: 2px solid var(--color-accent); outline-offset: 3px; }
	.variant-title { margin: 0; font-size: 0.85rem; color: var(--color-text-muted); }
	form > button { min-width: 9rem; }
	form > button[aria-disabled='true'] { cursor: default; }
	.checkout-note { margin: 0.45rem 0 0; font-size: 0.75rem; color: var(--color-text-muted); line-height: 1.6; }
	@media (max-width: 620px) {
		.product-detail { grid-template-columns: 1fr; gap: 1.25rem; }
		.gallery { max-width: 24rem; width: 100%; margin: auto; }
		.details { max-width: 24rem; width: 100%; margin: auto; padding-left: 1.35rem; }
		.details::before { width: 0.8rem; height: 2.75rem; }
	}
</style>
