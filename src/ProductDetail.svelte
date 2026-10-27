<script lang="ts">
	import { addToCart, cart } from './lib/cart';
	import { productTransitionName } from './lib/catalog';
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
	// A swatch clicked on the product's card opens on that color (?color=), when it is one of its options
	const requestedColor = new URLSearchParams(window.location.search).get('color');
	const initialColor = $derived(
		requestedColor && options?.colors.some((option) => option.name === requestedColor)
			? requestedColor
			: productSource(product, undefined, undefined, initialHandle).colors?.[0]?.name
	);
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
		// Keep the address on the chosen color, so a reload or a shared link opens on it
		const url = new URL(window.location.href);
		url.searchParams.set('color', name);
		history.replaceState(history.state, '', url);
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
		<div class="product-image note torn" style="--tear-shift: 7rem; --tear-tile: 23rem" style:view-transition-name={productTransitionName(product.id)}><span class="paper plain" aria-hidden="true"></span><img src={photos[photoIndex]} alt={`${product.title}${color ? `, ${color.name}` : ''}, photo ${photoIndex + 1} of ${photos.length}`} width="422" height="422" /></div>
		{#if photos.length > 1}
			<div class="thumbnails" role="group" aria-label="Product photos" style={`--count: ${photos.length}`}>
				{#each photos as photo, index}
					<button class="thumbnail" type="button" aria-label={`Show ${product.title}, photo ${index + 1} of ${photos.length}`} aria-pressed={index === photoIndex} onclick={() => (selectedPhoto = photo)}>
						<img src={photo} alt="" width="56" height="56" loading="lazy" />
					</button>
				{/each}
			</div>
		{/if}
	</div>
	<div class="details note">
		<!-- Words wrap only at spaces, never at hyphens like "T-shirt" -->
		<h1 tabindex="-1">{#each product.title.split(" ") as word, i}{i ? " " : ""}<span class="word">{word}</span>{/each}</h1>
		<p class="price" aria-live="polite" aria-atomic="true">{selected ? formatPrice(selected.price, selected.currency) : productPrice(product)}</p>
		{#if product.available}
			<form onsubmit={add}>
				{#if options}
					<!-- A single color needs no picker -->
					{#if options.colors.length > 1}
						<fieldset>
							<legend>Color<span>{color?.name ?? 'Choose a color'}</span></legend>
							<div class="color-options">
								{#each options.colors as option (option.name)}
									<label class="color-option" title={option.name}>
										<input type="radio" name="product-color" value={option.name} checked={color?.name === option.name} aria-label={option.name} onchange={() => selectColor(option.name)} />
										<span><ColorSwatch swatches={option.swatches} /></span>
									</label>
								{/each}
							</div>
						</fieldset>
					{/if}
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
	/* Centered on both axes in the shop's flex column */
	/* Gallery fits the photo and a row of seven thumbnails */
	.product-detail { display: grid; grid-template-columns: minmax(0, 28.5rem) minmax(0, 1fr); align-items: center; gap: 3rem; width: 100%; max-width: 58rem; margin: auto; }
	.gallery { min-width: 0; }
	/* Photo and details on taped notes, like the merch cards and bio */
	.product-image { aspect-ratio: 1; padding: 1rem; box-sizing: border-box; transform: rotate(-0.8deg); --tape-tilt: 3deg; }
	img { width: 100%; height: 100%; object-fit: contain; display: block; }
	/* Fewer thumbnails spread out a little more */
	.thumbnails { display: flex; flex-wrap: wrap; justify-content: center; gap: calc(0.6rem + max(0, 7 - var(--count, 7)) * 0.25rem); margin-top: 1.5rem; }
	/* Small paper scraps */
	.thumbnail { width: 3.5rem; height: 3.5rem; padding: 0.2rem; border: 2px solid transparent; border-radius: 1px; background: var(--gb-bg0-h); box-shadow: 0 1px 2px rgba(60, 56, 54, 0.18), 0 3px 6px rgba(60, 56, 54, 0.1); box-sizing: border-box; cursor: pointer; transition: transform 120ms ease; }
	.thumbnail:nth-child(odd) { transform: rotate(-1.5deg); }
	.thumbnail:nth-child(even) { transform: rotate(1.2deg); }
	.thumbnail:hover { border-color: var(--color-border); transform: rotate(0); }
	.thumbnail[aria-pressed='true'] { border-color: var(--color-accent); transform: rotate(0); }
	.thumbnail:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }
	.details { padding: 2rem 1.75rem 1.5rem; box-sizing: border-box; transform: rotate(0.6deg); --tape-tilt: -2deg; }
	h1 { margin: 0; font-size: clamp(1.35rem, 2.6vw, 1.7rem); letter-spacing: 0.04em; line-height: 1.25; }
	.word { white-space: nowrap; }
	.price { margin: 0.5rem 0 1.5rem; font-size: 1.15rem; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--color-text-muted); }
	form { display: flex; flex-direction: column; align-items: flex-start; gap: 1.25rem; }
	fieldset { min-width: 0; width: 100%; margin: 0; padding: 0; border: 0; }
	/* Labels match the bio lineup */
	legend { width: 100%; margin-bottom: 0.6rem; padding: 0; color: var(--color-text-subtle); font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
	legend span { margin-left: 0.65rem; color: var(--color-text-muted); font-weight: 400; letter-spacing: 0; text-transform: none; }
	.options { display: flex; flex-wrap: wrap; gap: 0.45rem; }
	.color-options { display: flex; flex-wrap: wrap; gap: 0.35rem; }
	.color-option { display: inline-flex; position: relative; cursor: pointer; }
	.color-option input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
	.color-option > span { display: flex; align-items: center; justify-content: center; width: 2.75rem; height: 2.75rem; border: 2px solid transparent; border-radius: 50%; box-sizing: border-box; }
	.color-option:hover > span { border-color: var(--color-border); }
	.color-option input:checked + span { border-color: var(--color-accent); }
	.color-option input:focus-visible + span { outline: 2px solid var(--color-accent); outline-offset: 3px; }
	.option { display: inline-flex; position: relative; cursor: pointer; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.06em; }
	.option input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
	.option > span { display: flex; align-items: center; justify-content: center; min-width: 2.75rem; min-height: 2.75rem; padding: 0.4rem 0.65rem; border: 1px solid var(--gb-bg2); border-radius: 2px; box-sizing: border-box; color: var(--color-text-subtle); background: var(--gb-bg0-h); }
	.option:hover > span { background: var(--gb-bg0-s); border-color: var(--color-text-muted); }
	.option input:checked + span { color: var(--color-surface); background: var(--color-accent); border-color: var(--color-accent); }
	.option input:disabled { cursor: not-allowed; }
	.option input:disabled + span { opacity: 0.45; text-decoration: line-through; }
	.option input:focus-visible + span { outline: 2px solid var(--color-accent); outline-offset: 3px; }
	.variant-title { margin: 0; font-size: 0.85rem; color: var(--color-text-muted); }
	/* Same bold call to action as the home merch button */
	form > button { min-width: 11rem; min-height: 3.25rem; padding-inline: 2rem; font-size: 1rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
	form > button[aria-disabled='true'] { cursor: default; }
	.checkout-note { margin: 0.6rem 0 0; font-size: 0.75rem; color: var(--color-text-muted); line-height: 1.6; }
	@media (max-width: 768px) {
		.product-detail { grid-template-columns: 1fr; gap: 2rem; }
		.gallery { max-width: 24rem; width: 100%; margin: auto; }
		.details { max-width: 24rem; width: 100%; margin: 0.5rem auto 0; padding: 1.75rem 1.25rem 1.25rem; }
	}
</style>
