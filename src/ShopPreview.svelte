<script lang="ts">
	import { onMount } from 'svelte';
	import ShopHeading from './ShopHeading.svelte';
	import ProductCard from './ProductCard.svelte';
	import { groupedProducts, refreshCatalog } from './lib/catalog';
	import IconArrowRight from '~icons/carbon/arrow-right';

	const featuredHandles = ['satb-t-shirt-mark-1-green-2', 'satb-trucker-hat-mark-1', 'satb-mug'];
	const featured = $derived([
		...featuredHandles.flatMap((handle) => $groupedProducts.filter((product) => product.handle === handle)),
		...$groupedProducts.filter((product) => !featuredHandles.includes(product.handle))
	].filter((product) => product.available).slice(0, 3));

	onMount(() => { void refreshCatalog().catch(() => {}); });
</script>

<section aria-label="Merch">
	<ShopHeading label="Merch" />
	{#if featured.length}
		<div class="products">
			{#each featured as product (product.id)}<ProductCard {product} />{/each}
		</div>
	{/if}
	<a class="shop-link" href="/shop">Shop all merch{#if $groupedProducts.length}{' '}({$groupedProducts.length}){/if}<IconArrowRight aria-hidden="true" /></a>
</section>

<style>
	section {
		width: 100%;
		max-width: 48rem;
		margin-top: 1.5rem;
	}

	.products {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.5rem;
		margin-top: 1.5rem;
	}

	.shop-link {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 2.75rem;
		margin-top: 1.25rem;
		font-size: 0.9rem;
	}

	@media (max-width: 500px) {
		.products { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; }
		.products :global(.product:last-child) { display: none; }
	}
</style>
