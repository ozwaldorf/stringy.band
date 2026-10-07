<script lang="ts">
	import { onMount } from 'svelte';
	import IconArrowLeft from '~icons/carbon/arrow-left';
	import IconBag from '~icons/carbon/shopping-bag';
	import ShopHeading from './ShopHeading.svelte';
	import ProductCard from './ProductCard.svelte';
	import ProductDetail from './ProductDetail.svelte';
	import ShopBag from './ShopBag.svelte';
	import ShopNotice from './ShopNotice.svelte';
	import Footer from './Footer.svelte';
	import { cart } from './lib/cart';
	import { catalog, groupedProducts, refreshCatalog } from './lib/catalog';
	import './lib/styles/shop.css';

	let { handle = '' }: { handle?: string } = $props();
	const product = $derived($groupedProducts.find((item) => item.members.some((member) => member.handle === handle)));
	const bagCount = $derived($cart.reduce((total, item) => total + item.quantity, 0));
	const title = $derived(handle === 'bag' ? 'Your bag' : product?.title ?? (handle ? $catalog.loading ? 'Loading item' : $catalog.error ? 'Item could not load' : 'Item unavailable' : 'Shop'));

	function retryCatalog() {
		void refreshCatalog(true).catch(() => {});
	}

	onMount(() => { void refreshCatalog().catch(() => {}); });
</script>

<svelte:head><title>{title} - Stringy and the Beans</title></svelte:head>

<div class="shop-page">
	<header>
		<a class="brand" href="/" aria-label="Stringy and the Beans home"><img src="/logo.svg" alt="" width="1000" height="700" /></a>
		<nav aria-label="Shop navigation">
			<a class="back-link" href={handle && handle !== 'bag' ? '/shop' : '/'}><IconArrowLeft aria-hidden="true" /> <span>{handle && handle !== 'bag' ? 'All merch' : 'Back to band'}</span></a>
			<a class="bag-link" class:current={handle === 'bag'} href="/shop/bag" aria-current={handle === 'bag' ? 'page' : undefined} aria-label={`Bag, ${bagCount} item${bagCount === 1 ? '' : 's'}`}><IconBag /> Bag <span class="bag-count">{bagCount}</span></a>
		</nav>
	</header>

	<main id="shop-content">
		{#if $catalog.error && (!handle || handle === 'bag' || product)}
			<ShopNotice
				title="Shop could not refresh"
				message={$catalog.products.length ? 'Showing the last available catalog. Refresh to confirm current prices and availability.' : 'We could not load the shop. Please try again.'}
				tone="warning"
				actionLabel={$catalog.loading ? 'Refreshing...' : 'Try again'}
				onaction={retryCatalog}
				actionDisabled={$catalog.loading}
			/>
		{/if}

		{#if handle === 'bag'}
			<ShopBag />
		{:else if !handle}
			<ShopHeading label="Merch" level="h1" />
			{#if $catalog.products.length}
				<div class="catalog-meta"><p>{$groupedProducts.length} items</p><p>Prices in {$catalog.products.flatMap((item) => item.variants)[0]?.currency ?? 'USD'}</p></div>
				<div class="product-grid">
					{#each $groupedProducts as item (item.id)}<ProductCard product={item} />{/each}
				</div>
			{:else if $catalog.loading}
				<ShopNotice title="Loading the shop" message="Checking the latest merch." />
			{:else if !$catalog.error}
				<ShopNotice title="No merch available" message="There are no items in the shop right now. Check back soon." actionLabel="Back to band" actionHref="/" />
			{/if}
		{:else if product}
			{#key `${product.id}:${handle}`}<ProductDetail {product} initialHandle={handle} />{/key}
		{:else}
			<ShopHeading label="Merch" level="h1" />
			{#if $catalog.loading}
				<ShopNotice title="Loading this item" message="Checking the latest product details." />
			{:else if $catalog.error}
				<ShopNotice title="Could not load this item" message="The shop could not be refreshed. Try again to check this item." tone="warning" actionLabel="Try again" onaction={retryCatalog} actionDisabled={$catalog.loading} />
			{:else}
				<ShopNotice title="Item unavailable" message="This item is not in the current shop. Take a look at the other merch." actionLabel="Browse all merch" actionHref="/shop" />
			{/if}
		{/if}
	</main>

	<Footer />
</div>

<style>
	.shop-page { min-height: 100dvh; max-width: 64rem; margin: auto; padding: 1rem 2rem; box-sizing: border-box; display: flex; flex-direction: column; }
	header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--color-border-subtle); }
	nav { display: flex; align-items: center; gap: 1.5rem; }
	.back-link, .bag-link { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 2.75rem; font-size: 0.8rem; text-decoration: none; }
	.back-link:hover { text-decoration: underline; }
	.bag-link { white-space: nowrap; padding: 0 0.8rem; border: 1px solid var(--color-border-subtle); border-radius: 4px; color: var(--color-text); }
	.bag-link:hover, .bag-link.current { background: var(--color-bg-subtle); border-color: var(--color-border); }
	.bag-count { min-width: 1.25rem; text-align: center; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
	.brand { display: block; flex-shrink: 0; }
	.brand img { display: block; width: 6rem; height: auto; }
	main { flex: 1; padding-top: 1.75rem; }
	.catalog-meta { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: 0.75rem; margin-bottom: 1rem; border-bottom: 1px solid var(--color-border-subtle); color: var(--color-text-muted); font-size: 0.75rem; }
	.catalog-meta p { margin: 0; }
	.product-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2rem 1.25rem; }
	@media (max-width: 760px) { .product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
	@media (max-width: 600px) {
		.shop-page { padding: 0.75rem 1.25rem; }
		header { gap: 0.75rem; }
		nav { gap: 0.75rem; }
		.brand img { width: 5rem; }
		.back-link, .bag-link { font-size: 0.75rem; gap: 0.25rem; }
		.bag-link { padding: 0 0.5rem; }
		.back-link :global(svg) { display: none; }
		main { padding-top: 1.5rem; }
		.product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.75rem 1rem; }
	}
</style>
