import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkoutUrl, fetchProducts, formatPrice, productPrice, SHOP_URL, withProductPage } from '../src/lib/fourthwall.ts';

const productId = '11111111-1111-4111-8111-111111111111';
const smallId = '22222222-2222-4222-8222-222222222222';
const largeId = '33333333-3333-4333-8333-333333333333';

function product() {
	return {
		id: productId,
		handle: 'band-tee',
		title: 'Band tee',
		url: '/products/band-tee',
		image: 'https://imgproxy.fourthwall.dev/tee.webp',
		available: true,
		variants: [
			{ id: smallId, title: 'Moss, S', price: { cents: 3000, currency_iso: 'USD' } },
			{ id: largeId, title: 'Moss, 2XL', price: { cents: 3200, currency_iso: 'USD' } }
		]
	};
}

test('fetches every page and retains variant price differences', async t => {
	const urls = [];
	t.mock.method(globalThis, 'fetch', async url => {
		urls.push(url);
		return Response.json({ current_page: urls.length, products: urls.length === 1 ? [product()] : [] });
	});
	const products = await fetchProducts();
	assert.deepEqual(urls, [`${SHOP_URL}/collections/all.json`, `${SHOP_URL}/collections/all/2.json`]);
	assert.equal(products[0].url, `${SHOP_URL}/products/band-tee`);
	assert.equal(products[0].variants[1].price, 3200);
	assert.equal(productPrice(products[0]), '$30.00 - $32.00');
});

test('rejects malformed variant prices and IDs', async t => {
	const value = product();
	t.mock.method(globalThis, 'fetch', async () => Response.json({ current_page: 1, products: [value] }));
	value.variants[0].price.cents = 30.5;
	await assert.rejects(fetchProducts(), /variant price/);
	value.variants[0].price.cents = 3000;
	value.variants[0].id = 'not-a-variant';
	await assert.rejects(fetchProducts(), /variant ID/);
});

test('rejects repeated pages instead of showing an incomplete catalog', async t => {
	t.mock.method(globalThis, 'fetch', async () => Response.json({ current_page: 1, products: [product()] }));
	await assert.rejects(fetchProducts(), /collection page/);
});

test('rejects non-shop product links', async t => {
	const value = { ...product(), url: 'https://example.com/products/band-tee' };
	t.mock.method(globalThis, 'fetch', async () => Response.json({ current_page: 1, products: [value] }));
	await assert.rejects(fetchProducts(), /product/);
});

test('checkout preserves variant IDs and merges repeated quantities', () => {
	const url = new URL(checkoutUrl([
		{ variantId: smallId, quantity: 1 },
		{ variantId: largeId, quantity: 2 },
		{ variantId: smallId, quantity: 3 }
	]));
	assert.equal(url.origin, SHOP_URL);
	assert.equal(url.pathname, '/cart/checkout');
	assert.equal(url.searchParams.get('products'), `${smallId}:4,${largeId}:2`);
	assert.equal(url.searchParams.get('currency'), 'USD');
});

test('checkout rejects empty bags, malformed IDs and invalid quantities', () => {
	assert.throws(() => checkoutUrl([]), /empty/);
	assert.throws(() => checkoutUrl([{ variantId: 'invalid', quantity: 1 }]), /variant ID/);
	for (const quantity of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
		assert.throws(() => checkoutUrl([{ variantId: smallId, quantity }]), /quantity/);
	}
	assert.throws(() => checkoutUrl([{ variantId: smallId, quantity: 1 }], 'USD&coupon=bad'), /currency/);
	assert.equal(formatPrice(1195), '$11.95');
});

test('live price refreshes preserve matching page metadata without restoring removed variants', () => {
	const current = { ...product(), variants: [
		{ id: smallId, title: 'Moss, S', price: 3300, currency: 'USD' },
		{ id: largeId, title: 'Natural, L', price: 3400, currency: 'USD' }
	] };
	const page = {
		images: ['https://imgproxy.fourthwall.dev/gallery.webp'],
		sections: [{ title: 'More details', content: [{ type: 'text', text: 'Cotton' }] }],
		colors: [{ name: 'Moss', swatches: ['#6b7053'] }, { name: 'Old color', swatches: ['#123456'] }],
		variantOptions: {
			[smallId]: { title: 'Moss, S', color: 'Moss', size: 'S' },
			[largeId]: { title: 'Old color, L', color: 'Old color', size: 'L' },
			'44444444-4444-4444-8444-444444444444': { title: 'Moss, XL', color: 'Moss', size: 'XL' }
		}
	};
	const result = withProductPage(current, page);
	assert.deepEqual(result.variants, current.variants);
	assert.equal(result.variants[0].price, 3300);
	assert.deepEqual(result.variantOptions, { [smallId]: page.variantOptions[smallId] });
	assert.deepEqual(result.colors, [page.colors[0]]);
	assert.deepEqual(result.sections, page.sections);
	assert.deepEqual(result.images, page.images);
});

test('missing color or option metadata leaves safe empty grouping data', () => {
	assert.deepEqual(withProductPage(product()).colors, []);
	assert.deepEqual(withProductPage(product()).variantOptions, {});
	const result = withProductPage(product(), {
		colors: [],
		variantOptions: { [smallId]: { title: 'Moss, S', color: 'Moss', size: 'S' } }
	});
	assert.deepEqual(result.variantOptions, {});
});
