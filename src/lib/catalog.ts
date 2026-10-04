import { get, writable } from 'svelte/store';
import data from './products.json';
import { fetchProducts, withProductPage, type Product } from './fourthwall';

export const catalog = writable({
	products: (data.products as Product[]).map(product => withProductPage(product)),
	fetchedAt: data.fetchedAt as string | null,
	verified: false,
	loading: false,
	error: ''
});

let pending: Promise<Product[]> | undefined;
let refreshedAt = 0;

export function refreshCatalog(force = false): Promise<Product[]> {
	if (pending) return pending;
	if (!force && Date.now() - refreshedAt < 60_000) return Promise.resolve(get(catalog).products);

	catalog.update((current) => ({ ...current, loading: true, error: '' }));
	pending = fetchProducts(AbortSignal.timeout(15_000))
		.then((products) => {
			const previousProducts = get(catalog).products;
			products = products.map(product => withProductPage(product, previousProducts.find(item => item.id === product.id)));
			refreshedAt = Date.now();
			catalog.set({ products, fetchedAt: new Date().toISOString(), verified: true, loading: false, error: '' });
			return products;
		})
		.catch((error: unknown) => {
			catalog.update((current) => ({
				...current,
				loading: false,
				verified: false,
				error: "We couldn't refresh the shop. Please try again."
			}));
			throw error;
		})
		.finally(() => {
			pending = undefined;
		});
	return pending;
}
