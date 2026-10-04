export const SHOP_URL = 'https://shop.stringy.band';

export type Variant = {
	id: string;
	title: string;
	price: number;
	currency: string;
};

export type ProductContentNode =
	| { type: 'text'; text: string }
	| { type: 'element'; tag: 'p' | 'ul' | 'ol' | 'li' | 'strong' | 'em' | 'br' | 'table' | 'thead' | 'tbody' | 'tr' | 'th' | 'td' | 'h3' | 'h4'; children: ProductContentNode[] };

export type ProductSection = { title: string; content: ProductContentNode[] };
export type ProductColor = { name: string; swatches: string[]; images?: string[] };
export type ProductVariantOption = { title: string; color: string; size: string };

export type Product = {
	id: string;
	handle: string;
	title: string;
	url: string;
	image: string;
	images?: string[];
	sections?: ProductSection[];
	colors?: ProductColor[];
	variantOptions?: Partial<Record<string, ProductVariantOption>>;
	available: boolean;
	variants: Variant[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURRENCY = /^[A-Z]{3}$/;

export function withProductPage(product: Product, page: Pick<Product, 'images' | 'sections' | 'colors' | 'variantOptions'> = product): Product {
	const images = page.images ?? [];
	const image = images[0] ?? product.image;
	const variantOptions = Object.fromEntries(product.variants.flatMap((variant) => {
		const option = page.variantOptions?.[variant.id];
		return option?.title === variant.title && page.colors?.some((color) => color.name === option.color)
			? [[variant.id, option]]
			: [];
	}));
	const colors = (page.colors ?? []).filter((color) => Object.values(variantOptions).some((option) => option.color === color.name));
	return { ...product, image, images: [...new Set([image, ...images])], sections: page.sections ?? [], colors, variantOptions };
}

function object(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('Invalid Fourthwall feed object');
	}
	return value as Record<string, unknown>;
}

function text(value: unknown): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error('Invalid Fourthwall feed text');
	}
	return value;
}

function uuid(value: unknown): string {
	if (typeof value !== 'string' || !UUID.test(value)) {
		throw new Error('Invalid Fourthwall product or variant ID');
	}
	return value.toLowerCase();
}

function currencyCode(value: unknown): string {
	if (typeof value !== 'string' || !CURRENCY.test(value)) {
		throw new Error('Invalid Fourthwall currency');
	}
	return value;
}

function parseProduct(value: unknown): Product {
	const product = object(value);
	const id = uuid(product.id);
	const handle = text(product.handle);
	const url = new URL(text(product.url), SHOP_URL);
	const image = new URL(text(product.image));
	if (
		url.origin !== SHOP_URL ||
		url.pathname !== `/products/${encodeURIComponent(handle)}` ||
		url.username || url.password ||
		image.protocol !== 'https:' || image.username || image.password ||
		typeof product.available !== 'boolean' ||
		!Array.isArray(product.variants)
	) {
		throw new Error('Invalid Fourthwall product');
	}
	const variants = product.variants.map((value): Variant => {
		const variant = object(value);
		const price = object(variant.price);
		if (typeof price.cents !== 'number' || !Number.isSafeInteger(price.cents) || price.cents < 0) {
			throw new Error('Invalid Fourthwall variant price');
		}
		return {
			id: uuid(variant.id),
			title: text(variant.title),
			price: price.cents,
			currency: currencyCode(price.currency_iso)
		};
	});
	if (
		(product.available && variants.length === 0) ||
		new Set(variants.map(variant => variant.id)).size !== variants.length ||
		new Set(variants.map(variant => variant.currency)).size > 1
	) {
		throw new Error('Invalid Fourthwall product variants');
	}
	return {
		id,
		handle,
		title: text(product.title),
		url: url.href,
		image: image.href,
		available: product.available,
		variants
	};
}

export async function fetchProducts(signal?: AbortSignal): Promise<Product[]> {
	const products: Product[] = [];
	const productIds = new Set<string>();
	const variantIds = new Set<string>();
	for (let page = 1; page <= 100; page++) {
		const response = await fetch(
			`${SHOP_URL}/collections/all${page === 1 ? '' : `/${page}`}.json`,
			{ signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) }
		);
		if (!response.ok) throw new Error(`Fourthwall feed: ${response.status} ${response.statusText}`);
		const feed = object(await response.json());
		if (!Array.isArray(feed.products) || feed.current_page !== page) {
			throw new Error('Invalid Fourthwall collection page');
		}
		if (feed.products.length === 0) return products;
		for (const value of feed.products) {
			const product = parseProduct(value);
			if (productIds.has(product.id) || product.variants.some(variant => variantIds.has(variant.id))) {
				throw new Error('Repeated Fourthwall product or variant');
			}
			productIds.add(product.id);
			product.variants.forEach(variant => variantIds.add(variant.id));
			products.push(product);
		}
	}
	throw new Error('Fourthwall collection exceeded pagination limit');
}

export function formatPrice(cents: number, currency = 'USD'): string {
	if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Invalid price');
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currencyCode(currency)
	}).format(cents / 100);
}

export function productPrice(product: Product): string {
	if (!product.variants.length) return 'Unavailable';
	const prices = product.variants.map(variant => variant.price);
	const minimum = Math.min(...prices);
	const maximum = Math.max(...prices);
	const currency = product.variants[0].currency;
	return minimum === maximum
		? formatPrice(minimum, currency)
		: `${formatPrice(minimum, currency)} - ${formatPrice(maximum, currency)}`;
}

export function checkoutUrl(items: { variantId: string; quantity: number }[], currency = 'USD'): string {
	if (!items.length) throw new Error('Your bag is empty');
	const quantities = new Map<string, number>();
	for (const item of items) {
		const id = uuid(item.variantId);
		if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
			throw new Error('Invalid item quantity');
		}
		const quantity = (quantities.get(id) ?? 0) + item.quantity;
		if (!Number.isSafeInteger(quantity)) throw new Error('Invalid item quantity');
		quantities.set(id, quantity);
	}
	const url = new URL('/cart/checkout', SHOP_URL);
	url.search = new URLSearchParams({
		products: [...quantities].map(([id, quantity]) => `${id}:${quantity}`).join(','),
		currency: currencyCode(currency)
	}).toString();
	return url.href;
}
