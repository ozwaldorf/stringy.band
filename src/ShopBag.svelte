<script lang="ts">
	import { onDestroy } from 'svelte';
	import { cart, cartLines, reconcileCart, removeFromCart, setQuantity } from './lib/cart';
	import { catalog, refreshCatalog } from './lib/catalog';
	import { checkoutUrl, formatPrice } from './lib/fourthwall';
	import { variantImage } from './lib/product-options';
	import ShopHeading from './ShopHeading.svelte';
	import ShopNotice from './ShopNotice.svelte';

	let checking = $state(false);
	let notice = $state<{ kind: 'updated' | 'currency' | 'error'; title: string; message: string } | null>(null);
	let active = true;
	const lines = $derived(cartLines($cart, $catalog.products));
	const unavailable = $derived($cart.length - lines.length);
	const currencies = $derived([...new Set(lines.map((line) => line.variant.currency))]);
	const subtotal = $derived(lines.reduce((total, line) => total + line.variant.price * line.quantity, 0));

	onDestroy(() => { active = false; });

	async function checkout() {
		if (checking) return;
		checking = true;
		notice = null;
		const previousPrices = new Map(lines.map((line) => [line.variantId, `${line.variant.price}:${line.variant.currency}`]));
		try {
			const products = await refreshCatalog(true);
			if (!active) return;
			const items = reconcileCart($cart, products);
			const currentLines = cartLines(items, products);
			const changed = items.length !== $cart.length || currentLines.some((line) => previousPrices.get(line.variantId) !== `${line.variant.price}:${line.variant.currency}`);
			cart.set(items);
			if (changed || !items.length) {
				notice = { kind: 'updated', title: 'Review your updated bag', message: 'Prices or availability have changed. Your bag has been updated; please review it before checking out.' };
				return;
			}
			if (new Set(currentLines.map((line) => line.variant.currency)).size !== 1) {
				notice = { kind: 'currency', title: 'Check out one currency at a time', message: 'Items using different currencies need separate checkouts. Please keep only one currency in your bag.' };
				return;
			}
			window.location.assign(checkoutUrl(items, currentLines[0].variant.currency));
		} catch {
			notice = $catalog.error ? null : { kind: 'error', title: "Checkout couldn't be started", message: "We couldn't confirm current prices. Please try checkout again." };
		} finally {
			checking = false;
		}
	}
</script>

<ShopHeading label="Your bag" level="h1" />
<a class="continue-link" href="/shop">Continue shopping</a>

{#if notice && notice.kind !== 'currency'}
	<ShopNotice title={notice.title} message={notice.message} tone={notice.kind === 'error' ? 'error' : 'warning'}
		actionLabel={!$cart.length ? 'Browse merch' : notice.kind === 'error' ? 'Try checkout again' : undefined}
		actionHref={!$cart.length ? '/shop' : undefined}
		onaction={notice.kind === 'error' && $cart.length ? checkout : undefined} actionDisabled={checking} />
{/if}
{#if unavailable && !$catalog.loading}
	{#if $catalog.verified}
		<ShopNotice title="Some items are no longer available" message="Remove these items to keep your bag up to date." tone="warning"
			actionLabel="Remove unavailable items" actionDisabled={checking} onaction={() => cart.set(reconcileCart($cart, $catalog.products))} />
	{:else if !$catalog.error}
		<ShopNotice title="Your saved items need a refresh" message="Some items could not be loaded. They are still in your bag; refresh the shop to confirm availability." tone="warning"
			actionLabel="Refresh shop" actionDisabled={checking || $catalog.loading} onaction={() => { void refreshCatalog(true).catch(() => {}); }} />
	{/if}
{/if}

{#if lines.length}
	<div class="bag-layout">
		<ul class="bag-items">
			{#each lines as line (line.variantId)}
				<li>
					<a class="item-image" href={`/shop/${line.product.handle}`} aria-label={line.product.title}><img src={variantImage(line.product, line.variantId)} alt="" width="110" height="110" /></a>
					<div class="item-details">
						<h2><a href={`/shop/${line.product.handle}`}>{line.product.title}</a></h2>
						<p>{line.variant.title}</p>
						<p class="unit-price">{formatPrice(line.variant.price, line.variant.currency)} each</p>
					</div>
					<p class="line-total">{formatPrice(line.quantity * line.variant.price, line.variant.currency)}</p>
					<div class="item-actions">
						<div class="quantity" role="group" aria-label={`Quantity for ${line.product.title}, ${line.variant.title}`}>
							<button type="button" disabled={checking || line.quantity <= 1} aria-label={`Decrease quantity for ${line.product.title}, ${line.variant.title}`} onclick={() => setQuantity(line.variantId, line.quantity - 1)}>-</button>
							<output aria-live="polite" aria-label="Quantity">{line.quantity}</output>
							<button type="button" disabled={checking || line.quantity >= 99} aria-label={`Increase quantity for ${line.product.title}, ${line.variant.title}`} onclick={() => setQuantity(line.variantId, line.quantity + 1)}>+</button>
						</div>
						<button class="shop-text-button" disabled={checking} aria-label={`Remove ${line.product.title}, ${line.variant.title}`} onclick={() => removeFromCart(line.variantId)}>Remove</button>
					</div>
				</li>
			{/each}
		</ul>
		<div class="bag-summary">
			<h2>Order summary</h2>
			{#if currencies.length === 1}
				<p class="subtotal"><span>Subtotal</span><strong>{formatPrice(subtotal, currencies[0])} <span class="currency">{currencies[0]}</span></strong></p>
			{:else}
				<ShopNotice title="Check out one currency at a time" message="Keep items in one currency in your bag, then check out the others separately." tone="warning" />
			{/if}
			<p class="checkout-note">Shipping and taxes calculated at checkout.</p>
			<button class="shop-button" disabled={checking || currencies.length !== 1} onclick={checkout}>{checking ? 'Checking prices...' : 'Continue to checkout'}</button>
			<p class="secure-note">Secure checkout with Fourthwall</p>
		</div>
	</div>
{:else if $cart.length && $catalog.loading}
	<ShopNotice title="Loading your bag..." />
{:else if !$cart.length && (!notice || notice.kind === 'currency')}
	<ShopNotice title="Your bag is empty" message="Find something for the next show." actionLabel="Browse merch" actionHref="/shop" />
{/if}

<style>
	.continue-link { display: inline-flex; align-items: center; min-height: 2.75rem; margin: 0.75rem 0; font-size: 0.8rem; }
	.bag-layout { display: grid; grid-template-columns: minmax(0, 1fr) 19rem; align-items: start; gap: 2.5rem; }
	.bag-items { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--color-border-subtle); }
	li { display: grid; grid-template-columns: 5.5rem minmax(0, 1fr) auto; align-items: start; gap: 0.6rem 1rem; padding: 1.25rem 0; border-bottom: 1px solid var(--color-border-subtle); }
	.item-image { grid-row: 1 / 3; aspect-ratio: 1; background: var(--color-bg-subtle); }
	img { display: block; width: 100%; height: 100%; object-fit: contain; }
	h2 { font-size: 0.9rem; line-height: 1.45; font-weight: 600; text-transform: none; letter-spacing: 0; margin: 0 0 0.35rem; }
	h2 a { color: var(--color-text); text-decoration: none; }
	h2 a:hover { color: var(--color-link-hover); text-decoration: underline; }
	.item-details p { margin: 0.2rem 0; font-size: 0.75rem; color: var(--color-text-muted); }
	.item-details .unit-price { font-size: 0.7rem; }
	.item-actions { grid-column: 2 / -1; display: flex; align-items: center; gap: 1rem; }
	.item-actions > button { font-size: 0.75rem; }
	.quantity { display: inline-flex; align-items: center; border: 1px solid var(--color-border); border-radius: 2px; }
	.quantity button { width: 2.75rem; height: 2.75rem; padding: 0; border: 0; background: transparent; color: var(--color-text); font: inherit; font-size: 1rem; cursor: pointer; }
	.quantity button:hover:not(:disabled) { background: var(--color-bg-subtle); }
	.quantity button:disabled { color: var(--color-text-faint); cursor: not-allowed; }
	.quantity output { min-width: 1.75rem; text-align: center; font-size: 0.8rem; font-variant-numeric: tabular-nums; }
	.line-total { margin: 0; padding-top: 0.1rem; text-align: right; white-space: nowrap; font-size: 0.85rem; font-weight: 600; font-variant-numeric: tabular-nums; }
	.bag-summary { padding: 1.5rem; background: var(--color-bg-subtle); }
	.bag-summary h2 { margin-bottom: 1.25rem; }
	.subtotal { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; font-size: 0.85rem; margin: 0; }
	.subtotal strong { font-weight: 600; font-variant-numeric: tabular-nums; }
	.currency { font-weight: 400; font-size: 0.7rem; color: var(--color-text-muted); }
	.checkout-note { font-size: 0.75rem; line-height: 1.6; color: var(--color-text-muted); margin: 0.6rem 0 1.25rem; }
	.bag-summary .shop-button { width: 100%; }
	.secure-note { text-align: center; font-size: 0.75rem; color: var(--color-text-muted); margin: 0.75rem 0 0; }
	@media (max-width: 850px) {
		.bag-layout { grid-template-columns: 1fr; gap: 1.5rem; }
		.bag-summary { width: 100%; max-width: 24rem; margin-left: auto; box-sizing: border-box; }
	}
	@media (max-width: 480px) {
		li { grid-template-columns: 4rem minmax(0, 1fr) auto; column-gap: 0.75rem; }
		h2 { font-size: 0.8rem; }
		.line-total { font-size: 0.8rem; }
		.item-actions { gap: 0.75rem; }
		.bag-summary { max-width: none; padding: 1.25rem; }
	}
</style>
