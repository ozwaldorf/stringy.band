<script lang="ts">
	import { onMount } from 'svelte';
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
		<span class="paper" aria-hidden="true"></span>
		<a class="brand" href="/" aria-label="Stringy and the Beans home"><img src="/logo.svg" alt="" width="1000" height="700" /></a>
		<nav class="crumbs" aria-label="Breadcrumb">
			<ol>
				<li><a href="/#merch">Home</a></li>
				<li>{#if handle}<a href="/shop">Merch</a>{:else}<span aria-current="page">Merch</span>{/if}</li>
				{#if handle}<li class="here"><span aria-current="page">{handle === 'bag' ? 'Bag' : title}</span></li>{/if}
			</ol>
		</nav>
		<nav aria-label="Shop navigation">
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
				<p class="catalog-meta">{$groupedProducts.length} items, prices in {$catalog.products.flatMap((item) => item.variants)[0]?.currency ?? 'USD'}</p>
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
	/* Sticky torn paper sheet, matching the home header; the negative margin reaches the top of the page */
	header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 4rem; box-sizing: border-box; margin-top: -1rem; padding-top: 0.5rem; }
	header .paper { left: calc(50% - 50vw); right: calc(50% - 50vw); }
	nav { display: flex; align-items: center; gap: 1.5rem; }
	/* Trail back home and to the shop, in the same type as the home section links */
	.crumbs { flex: 1; min-width: 0; }
	.crumbs ol { display: flex; align-items: center; min-width: 0; margin: 0; padding: 0; list-style: none; }
	.crumbs li { display: flex; align-items: center; flex: none; }
	.crumbs li + li::before { content: '/'; margin: 0 0.6rem; color: var(--color-text-faint); font-weight: 400; }
	/* The current item gives way first, trimmed rather than wrapped */
	.crumbs .here { flex: 0 1 auto; min-width: 0; }
	.crumbs a, .crumbs span, .bag-link { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 2.75rem; color: var(--color-text-subtle); font-weight: 700; font-size: 0.9rem; letter-spacing: 0.14em; text-transform: uppercase; text-decoration: none; transition: color 120ms ease; }
	.crumbs a:hover, .bag-link:hover, .bag-link.current { color: var(--color-link-hover); }
	.crumbs span[aria-current] { color: var(--color-text); }
	.crumbs .here span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 2.75rem; }
	.bag-link { white-space: nowrap; }
	.bag-count { min-width: 1.25rem; text-align: center; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
	.brand { display: block; flex-shrink: 0; }
	.brand img { display: block; width: auto; height: 2.5rem; }
	main { flex: 1; display: flex; flex-direction: column; padding-top: 4rem; }
	/* Subtitle under the heading */
	.catalog-meta { margin: 0.5rem 0 0; color: var(--color-text-muted); font-size: 0.8rem; text-align: center; }
	.product-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3.25rem 2.25rem; margin: 2.75rem 0 4rem; }
	@media (max-width: 760px) { .product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
	@media (max-width: 600px) {
		.shop-page { padding: 0.75rem 1.25rem; --footer-bleed: 0.75rem; }
		header { gap: 0.75rem; margin-top: -0.75rem; }
		nav { gap: 0.75rem; }
		.crumbs a, .crumbs span, .bag-link { font-size: 0.8rem; letter-spacing: 0.1em; gap: 0.25rem; }
		.crumbs li + li::before { margin: 0 0.4rem; }
		main { padding-top: 3.5rem; }
		.product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2.5rem 1.5rem; }
	}
</style>
