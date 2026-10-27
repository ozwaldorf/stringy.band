<script lang="ts">
	import { onMount } from 'svelte';
	import ShopHeading from './ShopHeading.svelte';
	import ProductCard from './ProductCard.svelte';
	import { groupedProducts, refreshCatalog } from './lib/catalog';
	import IconArrowRight from '~icons/carbon/arrow-right';
	import './lib/styles/shop.css';

	const featuredHandles = ['satb-t-shirt-mark-1-green-2', 'satb-trucker-hat-mark-1', 'satb-mug'];
	const featured = $derived([
		...featuredHandles.flatMap((handle) => $groupedProducts.filter((product) => product.handle === handle)),
		...$groupedProducts.filter((product) => !featuredHandles.includes(product.handle))
	].filter((product) => product.available).slice(0, 3));

	onMount(() => { void refreshCatalog().catch(() => {}); });
</script>

<section id="merch" aria-label="Merch">
	<ShopHeading label="Merch" />
	{#if featured.length}
		<div class="products">
			{#each featured as product (product.id)}<ProductCard {product} />{/each}
		</div>
	{/if}
	<a class="shop-button shop-link" href="/shop">Shop all merch{#if $groupedProducts.length}{' '}({$groupedProducts.length}){/if}<IconArrowRight aria-hidden="true" /></a>
</section>

<style>
	section {
		width: 100%;
		max-width: 48rem;
		margin-top: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.products {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1.5rem;
		/* Room for the tape that overhangs each card */
		padding-top: 1rem;
	}

	/* Primary call to action, larger than the shop's own buttons */
	.shop-link {
		display: flex;
		gap: 0.6rem;
		width: fit-content;
		min-height: 3.25rem;
		margin: 2rem auto 0;
		padding-inline: 2rem;
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	@media (max-width: 500px) {
		.products { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; }
		.products :global(.product:last-child) { display: none; }
	}
</style>
