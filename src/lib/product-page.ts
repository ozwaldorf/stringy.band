import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import type { ProductColor, ProductContentNode, ProductSection, ProductVariantOption } from './fourthwall';

type HtmlNode = DefaultTreeAdapterTypes.Node;
type HtmlElement = DefaultTreeAdapterTypes.Element;
type ContentTag = Extract<ProductContentNode, { type: 'element' }>['tag'];

export type ProductPage = { images: string[]; sections: ProductSection[]; colors?: ProductColor[]; variantOptions?: Record<string, ProductVariantOption> };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const contentTags = new Set<string>(['p', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h3', 'h4']);
const excludedTags = new Set(['script', 'style', 'iframe', 'img', 'svg', 'math', 'object', 'embed', 'link', 'meta', 'template', 'noscript', 'input', 'button', 'select', 'textarea', 'video', 'audio', 'picture', 'source', 'canvas']);

function attribute(node: HtmlElement, name: string): string | undefined {
	return node.attrs.find((attribute) => attribute.name === name)?.value;
}

function hasClass(node: HtmlElement, name: string): boolean {
	return (attribute(node, 'class') ?? '').split(/\s+/).includes(name);
}

function hidden(node: HtmlElement): boolean {
	return attribute(node, 'hidden') !== undefined || hasClass(node, 'hidden') ||
		attribute(node, 'aria-hidden')?.trim().toLowerCase() === 'true' ||
		/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden)\s*(?:!important\s*)?(?:;|$)/i.test(attribute(node, 'style') ?? '');
}

function elements(node: HtmlNode, match: (node: HtmlElement) => boolean, visibleOnly = false): HtmlElement[] {
	if ('tagName' in node && visibleOnly && (hidden(node) || excludedTags.has(node.tagName))) return [];
	return [
		...('tagName' in node && match(node) ? [node] : []),
		...('childNodes' in node ? node.childNodes.flatMap((child) => elements(child, match, visibleOnly)) : [])
	];
}

function contentNodes(node: HtmlNode): ProductContentNode[] {
	if ('value' in node) return [{ type: 'text', text: node.value }];
	if (!('tagName' in node) || hidden(node) || excludedTags.has(node.tagName)) return [];
	const children = node.childNodes.flatMap(contentNodes);
	if (contentTags.has(node.tagName)) return [{ type: 'element', tag: node.tagName as ContentTag, children }];
	return children;
}

function contentText(nodes: ProductContentNode[]): string {
	return nodes.map((node) => node.type === 'text' ? node.text : contentText(node.children)).join('');
}

function parseSections(document: HtmlNode): ProductSection[] {
	const sections: ProductSection[] = [];
	for (const container of elements(document, (node) => hasClass(node, 'product-info__additional-info'), true)) {
		for (const accordion of elements(container, (node) => hasClass(node, 'accordion'), true)) {
			const heading = elements(accordion, (node) => hasClass(node, 'accordion__title'), true)[0];
			if (!heading) continue;
			const title = contentText(contentNodes(heading)).replace(/\s+/g, ' ').trim();
			if (!['More details', 'Size & Fit'].includes(title)) continue;
			const body = elements(accordion, (node) => hasClass(node, 'accordion__content'), true)[0];
			if (!body) continue;
			const content = contentNodes(body);
			if (contentText(content).trim()) sections.push({ title, content });
		}
	}
	return sections;
}

function httpsUrl(value: unknown, label: string): string {
	if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid ${label}`);
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`Invalid ${label}`);
	}
	if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`Invalid ${label}`);
	return url.href;
}

function productNodes(value: unknown): Record<string, unknown>[] {
	if (Array.isArray(value)) return value.flatMap(productNodes);
	if (!value || typeof value !== 'object') return [];
	const node = value as Record<string, unknown>;
	const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
	return [...(types.includes('Product') ? [node] : []), ...productNodes(node['@graph'])];
}

function matchingProducts(document: HtmlNode, handle: string): Record<string, unknown>[] {
	const products: Record<string, unknown>[] = [];
	let malformed = false;
	for (const script of elements(document, (node) => node.tagName === 'script' && attribute(node, 'type')?.trim().toLowerCase() === 'application/ld+json')) {
		let data: unknown;
		try {
			data = JSON.parse(script.childNodes.flatMap((child) => 'value' in child ? [child.value] : []).join(''));
		} catch {
			malformed = true;
			continue;
		}
		for (const product of productNodes(data)) {
			if (product.sku === handle) products.push(product);
		}
	}
	if (!products.length) {
		throw new Error(malformed ? `Invalid JSON-LD data for ${handle}` : `No matching Product images found for ${handle}`);
	}
	return products;
}

function parseProductImages(products: Record<string, unknown>[], handle: string): string[] {
	const images = new Set<string>();
	for (const product of products) {
		if (!Array.isArray(product.image) || product.image.length === 0) {
			throw new Error(`Invalid product image data for ${handle}`);
		}
		for (const image of product.image) images.add(httpsUrl(image, `product image URL for ${handle}`));
	}
	return [...images];
}

function productComponent(document: HtmlNode): HtmlElement | undefined {
	return elements(document, (node) => node.tagName === 'product-component')[0];
}

function swatchColors(component: HtmlElement): ProductColor[] {
	const colors = new Map<string, ProductColor>();
	for (const swatch of elements(component, (node) => hasClass(node, 'color-swatch'))) {
		const input = elements(swatch, (node) => node.tagName === 'input' && attribute(node, 'data-product-option-type') === 'COLOR')[0];
		const name = input && attribute(input, 'value')?.trim();
		if (!name) throw new Error('Invalid product color name');
		const swatches = elements(swatch, (node) => hasClass(node, 'color-swatch__color')).map((node) => {
			const match = (attribute(node, 'style') ?? '').match(/(?:^|;)\s*background-color\s*:\s*(#[0-9a-f]{6}|#[0-9a-f]{3}|#[0-9a-f]{8}|#[0-9a-f]{4})\s*(?:!important\s*)?(?:;|$)/i);
			if (!match) throw new Error('Invalid product color swatch');
			return match[1].toLowerCase();
		});
		if (!swatches.length || colors.has(name)) throw new Error('Invalid product color swatches');
		colors.set(name, { name, swatches: [...new Set(swatches)] });
	}
	return [...colors.values()];
}

function object(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid product options');
	return value as Record<string, unknown>;
}

function uuid(value: unknown): string {
	if (typeof value !== 'string' || !uuidPattern.test(value)) throw new Error('Invalid product option ID');
	return value.toLowerCase();
}

function optionMetadata(document: HtmlNode, products: Record<string, unknown>[], handle: string, value: unknown): Partial<ProductPage> {
	try {
		const component = productComponent(document);
		if (!component || value === undefined) return {};
		const offer = object(value);
		if (uuid(offer.id) !== uuid(attribute(component, 'product-id'))) return {};
		const colors = swatchColors(component);
		if (!colors.length || !Array.isArray(offer.variants) || !Array.isArray(offer.images)) return {};
		const images = new Map<string, string>();
		for (const value of offer.images) {
			const image = object(value);
			const id = uuid(image.id);
			if (images.has(id)) throw new Error('Repeated product image ID');
			images.set(id, httpsUrl(image.url, 'product option image URL'));
		}
		const titles = new Map<string, string>();
		for (const product of products) {
			if (!Array.isArray(product.offers)) return {};
			for (const value of product.offers) {
				const entry = object(value);
				const url = new URL(httpsUrl(entry.url, 'product option URL'));
				if (url.pathname !== `/products/${encodeURIComponent(handle)}` || url.searchParams.getAll('variant').length !== 1 || typeof entry.name !== 'string') return {};
				titles.set(uuid(url.searchParams.get('variant')), entry.name);
			}
		}
		const variantOptions: Record<string, ProductVariantOption> = {};
		const combinations = new Set<string>();
		for (const value of offer.variants) {
			const variant = object(value);
			const id = uuid(variant.id);
			if (variantOptions[id] || !Array.isArray(variant.options) || variant.options.length !== 2 || !Array.isArray(variant.imageIds)) return {};
			const options = variant.options.map(object);
			const color = options.find((option) => option.type === 'COLOR')?.value;
			const size = options.find((option) => option.type === 'SIZE')?.value;
			if (typeof color !== 'string' || typeof size !== 'string' || !size.trim()) return {};
			const sourceColor = colors.find((entry) => entry.name === color);
			const title = titles.get(id);
			if (!sourceColor || title !== `${color}, ${size}` || combinations.has(title)) return {};
			const colorImages = variant.imageIds.map((value) => {
				const image = images.get(uuid(value));
				if (!image) throw new Error('Unknown product option image');
				return image;
			});
			if (colorImages.length) sourceColor.images = [...new Set([...(sourceColor.images ?? []), ...colorImages])];
			variantOptions[id] = { title, color, size };
			combinations.add(title);
		}
		if (!Object.keys(variantOptions).length) return {};
		return { colors: colors.filter((color) => Object.values(variantOptions).some((option) => option.color === color.name)), variantOptions, ...(images.size ? { images: [...images.values()] } : {}) };
	} catch {
		return {};
	}
}

function pageData(document: HtmlNode, handle: string, offer?: unknown): ProductPage {
	const products = matchingProducts(document, handle);
	return { images: parseProductImages(products, handle), sections: parseSections(document), ...optionMetadata(document, products, handle, offer) };
}

export function parseProductPage(source: string, handle: string, offer?: unknown): ProductPage {
	return pageData(parse(source), handle, offer);
}

export async function fetchProductPage(product: { url: string; handle: string }, signal?: AbortSignal): Promise<ProductPage> {
	const response = await fetch(httpsUrl(product.url, `product page URL for ${product.handle}`), {
		signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000)
	});
	if (!response.ok) throw new Error(`Fourthwall product page for ${product.handle}: ${response.status} ${response.statusText}`);
	const document = parse(await response.text());
	const page = pageData(document, product.handle);
	const component = productComponent(document);
	const id = component && attribute(component, 'product-id');
	if (!component || !id || !uuidPattern.test(id) || !elements(component, (node) => hasClass(node, 'color-swatch')).length) return page;
	try {
		const url = new URL(`/platform/api/v1/offers/${id}`, product.url);
		const currency = attribute(component, 'data-currency');
		if (currency && /^[A-Z]{3}$/.test(currency)) url.searchParams.set('currency', currency);
		const response = await fetch(url.href, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) });
		if (!response.ok) return page;
		return { ...page, ...optionMetadata(document, matchingProducts(document, product.handle), product.handle, await response.json()) };
	} catch {
		return page;
	}
}
