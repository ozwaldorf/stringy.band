import assert from 'node:assert/strict';
import { test } from 'node:test';
import { get } from 'svelte/store';
import { addToCart, cart, cartLines, normalizeCart, reconcileCart, removeFromCart, setQuantity } from '../src/lib/cart.ts';

const firstId = '12345678-abcd-4abc-8abc-123456789abc';
const secondId = '23456789-abcd-4abc-8abc-123456789abc';
const missingId = '34567890-abcd-4abc-8abc-123456789abc';
let moduleCount = 0;

async function withStorage(storage, run) {
	const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
	Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });
	try {
		await run(await import(`../src/lib/cart.ts?test=${++moduleCount}`));
	} finally {
		if (original) Object.defineProperty(globalThis, 'window', original);
		else delete globalThis.window;
	}
}

const products = [
	{
		id: 'first',
		handle: 'shirt',
		title: 'Shirt',
		url: 'https://example.com/shirt',
		image: 'https://example.com/shirt.png',
		available: true,
		variants: [{ id: firstId, title: 'Small', price: 2500, currency: 'USD' }]
	},
	{
		id: 'second',
		handle: 'cap',
		title: 'Cap',
		url: 'https://example.com/cap',
		image: 'https://example.com/cap.png',
		available: false,
		variants: [{ id: secondId, title: 'One size', price: 2000, currency: 'USD' }]
	}
];

test('normalization rejects malformed cart shapes and quantities', () => {
	for (const value of [null, {}, 'invalid', 42]) assert.deepEqual(normalizeCart(value), []);
	assert.deepEqual(normalizeCart([
		null,
		{},
		{ variantId: 'invalid', quantity: 1 },
		{ variantId: firstId, quantity: 0 },
		{ variantId: firstId, quantity: -2 },
		{ variantId: firstId, quantity: 1.5 },
		{ variantId: firstId, quantity: '2' },
		{ variantId: firstId, quantity: Infinity },
		{ variantId: firstId, quantity: NaN }
	]), []);
});

test('normalization merges UUID casing and duplicate counts, caps quantities, and strips extra data', () => {
	assert.deepEqual(normalizeCart([
		{ variantId: firstId.toUpperCase(), quantity: 2, price: 1, title: 'Stale title' },
		{ variantId: firstId, quantity: 3 },
		{ variantId: secondId, quantity: 98 },
		{ variantId: secondId, quantity: 10 }
	]), [
		{ variantId: firstId, quantity: 5 },
		{ variantId: secondId, quantity: 99 }
	]);
});

test('reconciliation removes unknown and unavailable variants', () => {
	const items = [
		{ variantId: firstId, quantity: 2 },
		{ variantId: secondId, quantity: 3 },
		{ variantId: missingId, quantity: 1 }
	];
	assert.deepEqual(reconcileCart(items, products), [{ variantId: firstId, quantity: 2 }]);
	assert.deepEqual(reconcileCart(items, []), []);
	assert.deepEqual(reconcileCart(items, [{ ...products[0], variants: [] }]), []);
});

test('resolved line amounts use current catalog prices and integer quantities', () => {
	const lines = cartLines([
		{ variantId: firstId, quantity: 2 },
		{ variantId: firstId, quantity: 1 }
	], products);
	assert.equal(lines.length, 1);
	assert.equal(lines[0].product, products[0]);
	assert.equal(lines[0].variant, products[0].variants[0]);
	assert.equal(lines[0].quantity * lines[0].variant.price, 7500);
	assert.equal(lines[0].variant.currency, 'USD');
});

test('bag actions preserve line order, cap counts, and remove zero quantities', () => {
	cart.set([]);
	addToCart(firstId);
	addToCart(firstId.toUpperCase());
	addToCart(secondId);
	addToCart('invalid');
	setQuantity(firstId, 100);
	setQuantity(secondId, -1);
	setQuantity(secondId, 2.5);
	assert.deepEqual(get(cart), [
		{ variantId: firstId, quantity: 99 },
		{ variantId: secondId, quantity: 1 }
	]);
	setQuantity(firstId.toUpperCase(), 0);
	assert.deepEqual(get(cart), [{ variantId: secondId, quantity: 1 }]);
	removeFromCart(secondId);
	assert.deepEqual(get(cart), []);
});

test('invalid saved JSON is cleared when the bag loads', async () => {
	const removed = [];
	await withStorage({
		getItem: () => '{invalid',
		removeItem: (key) => removed.push(key)
	}, ({ cart: savedCart }) => {
		assert.deepEqual(get(savedCart), []);
		assert.deepEqual(removed, ['stringy-shop-cart-v1']);
	});
});

test('saved bag hydration persists only normalized variant IDs and quantities', async () => {
	const writes = [];
	await withStorage({
		getItem: () => JSON.stringify([
			{ variantId: firstId, quantity: 2, title: 'Stale title', price: 1 },
			{ variantId: firstId, quantity: 3 },
			{ variantId: 'invalid', quantity: 1 }
		]),
		setItem: (key, value) => writes.push([key, JSON.parse(value)])
	}, ({ cart: savedCart }) => {
		assert.deepEqual(get(savedCart), [{ variantId: firstId, quantity: 5 }]);
		assert.deepEqual(writes, [['stringy-shop-cart-v1', [{ variantId: firstId, quantity: 5 }]]]);
	});
});

test('blocked storage does not prevent bag actions', async () => {
	const blocked = () => { throw new Error('Storage blocked'); };
	await withStorage({ getItem: blocked, setItem: blocked, removeItem: blocked }, (saved) => {
		saved.addToCart(firstId);
		assert.deepEqual(get(saved.cart), [{ variantId: firstId, quantity: 1 }]);
		saved.removeFromCart(firstId);
		assert.deepEqual(get(saved.cart), []);
	});
});
