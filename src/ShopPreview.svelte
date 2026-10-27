<script lang="ts">
	import { onMount } from 'svelte';
	import SectionHeading from './SectionHeading.svelte';
	import Bean from './Bean.svelte';
	import ProductCard from './ProductCard.svelte';
	import { groupedProducts, refreshCatalog } from './lib/catalog';
	import './lib/styles/shop.css';

	const featuredHandles = ['satb-t-shirt-mark-1-green-2', 'satb-trucker-hat-mark-1', 'satb-mug'];
	const featured = $derived([
		...featuredHandles.flatMap((handle) => $groupedProducts.filter((product) => product.handle === handle)),
		...$groupedProducts.filter((product) => !featuredHandles.includes(product.handle))
	].filter((product) => product.available).slice(0, 4));

	onMount(() => { void refreshCatalog().catch(() => {}); });
</script>

<section id="merch" aria-label="Merch">
	<SectionHeading label="Merch" level="h2" />
	{#if featured.length}
		<div class="products">
			{#each featured as product (product.id)}<ProductCard {product} />{/each}
		</div>
	{/if}
	<div class="shop-link-row">
		<a class="shop-button shop-link" href="/shop">Shop all merch{#if $groupedProducts.length}{' '}({$groupedProducts.length}){/if}</a>
		<span class="button-bean"><Bean which="a" size="100%" /></span>
	</div>
</section>

<style>
	/* One row of cards; wider screens fit more columns at the same card size */
	section {
		--cols: 3;
		width: 100%;
		max-width: calc(var(--cols) * 15rem + (var(--cols) - 1) * 1.5rem);
		margin-top: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.products {
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		gap: 1.5rem;
		/* Room for the tape that overhangs each card */
		padding-top: 1rem;
	}

	/* Primary call to action, larger than the shop's own buttons */
	/* Keeps the button centred; the bean hangs off its right side */
	.shop-link-row {
		position: relative;
		width: fit-content;
		margin: 2rem auto 0;
	}

	/* Sized as a share of the button, so it scales with it */
	.button-bean {
		position: absolute;
		left: calc(100% + 0.75rem);
		width: 22%;
		bottom: -2.25rem;
		transform: scaleX(-1) rotate(-4deg);
		pointer-events: none;
	}

	.shop-link {
		display: flex;
		gap: 0.6rem;
		width: fit-content;
		min-height: 3.25rem;
		padding-inline: 2rem;
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	/* Cards past the column count are hidden so the row never wraps */
	@media (max-width: 768px) {
		section { --cols: 2; }
		.products { gap: 1.25rem; }
		.products > :global(.product:nth-child(n + 3)) { display: none; }
		/* No room beside the button on a phone */
		.button-bean { display: none; }
	}

	@media (min-width: 769px) and (max-width: 1099px) {
		.products > :global(.product:nth-child(n + 4)) { display: none; }
	}

	@media (min-width: 1100px) {
		section { --cols: 4; }
	}
</style>
