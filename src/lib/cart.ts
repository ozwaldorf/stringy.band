import { writable, type Writable } from 'svelte/store';
import type { Product, Variant } from './fourthwall';

export type CartItem = {
	variantId: string;
	quantity: number;
};

export type CartLine = CartItem & {
	product: Product;
	variant: Variant;
};

const storageKey = 'stringy-shop-cart-v1';
const variantIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeCart(value: unknown): CartItem[] {
	if (!Array.isArray(value)) return [];
	const quantities = new Map<string, number>();
	for (const item of value) {
		if (
			!item ||
			typeof item !== 'object' ||
			typeof item.variantId !== 'string' ||
			!variantIdPattern.test(item.variantId) ||
			!Number.isInteger(item.quantity) ||
			item.quantity < 1
		) continue;
		const variantId = item.variantId.toLowerCase();
		quantities.set(variantId, Math.min(99, (quantities.get(variantId) ?? 0) + item.quantity));
	}
	return [...quantities].map(([variantId, quantity]) => ({ variantId, quantity }));
}

function readCart(): CartItem[] {
	try {
		if (typeof window !== 'undefined') {
			return normalizeCart(JSON.parse(window.localStorage.getItem(storageKey) ?? '[]'));
		}
	} catch {
		// Storage may be blocked or contain invalid JSON.
	}
	return [];
}

const state = writable<CartItem[]>(readCart());

state.subscribe((items) => {
	try {
		if (typeof window === 'undefined') return;
		if (items.length) window.localStorage.setItem(storageKey, JSON.stringify(items));
		else window.localStorage.removeItem(storageKey);
	} catch {
		// Keep the bag usable when storage is unavailable.
	}
});

export const cart: Writable<CartItem[]> = {
	subscribe: state.subscribe,
	set: (items) => state.set(normalizeCart(items)),
	update: (updater) => state.update((items) => normalizeCart(updater(items)))
};

export function addToCart(variantId: string): void {
	cart.update((items) => [...items, { variantId, quantity: 1 }]);
}

export function setQuantity(variantId: string, quantity: number): void {
	if (!variantIdPattern.test(variantId) || !Number.isInteger(quantity) || quantity < 0) return;
	variantId = variantId.toLowerCase();
	cart.update((items) => {
		if (quantity === 0) return items.filter((item) => item.variantId !== variantId);
		if (items.some((item) => item.variantId === variantId)) {
			return items.map((item) => item.variantId === variantId ? { variantId, quantity } : item);
		}
		return [...items, { variantId, quantity }];
	});
}

export function removeFromCart(variantId: string): void {
	setQuantity(variantId, 0);
}

export function cartLines(items: CartItem[], products: Product[]): CartLine[] {
	const variants = new Map<string, { product: Product; variant: Variant }>();
	for (const product of products) {
		if (!product.available) continue;
		for (const variant of product.variants) {
			variants.set(variant.id.toLowerCase(), { product, variant });
		}
	}
	return normalizeCart(items).flatMap((item) => {
		const match = variants.get(item.variantId);
		return match ? [{ ...item, ...match }] : [];
	});
}

export function reconcileCart(items: CartItem[], products: Product[]): CartItem[] {
	return cartLines(items, products).map(({ variantId, quantity }) => ({ variantId, quantity }));
}
