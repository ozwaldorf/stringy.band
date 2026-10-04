import type { Product, ProductColor, Variant } from './fourthwall';

export type ProductOptions = {
	colors: ProductColor[];
	sizes: string[];
	variants: Array<{ variant: Variant; color: string; size: string }>;
};

export function productOptions(product: Product): ProductOptions | undefined {
	if (!product.variants.length || !product.colors?.length || !product.variantOptions) return;
	const colorNames = new Set(product.colors.map((color) => color.name));
	if (colorNames.size !== product.colors.length) return;
	const variants: ProductOptions['variants'] = [];
	const combinations = new Set<string>();
	for (const variant of product.variants) {
		const option = product.variantOptions[variant.id];
		if (!option || option.title !== variant.title || !colorNames.has(option.color) || !option.size?.trim()) return;
		const combination = JSON.stringify([option.color, option.size]);
		if (combinations.has(combination)) return;
		combinations.add(combination);
		variants.push({ variant, color: option.color, size: option.size });
	}
	const usedColors = new Set(variants.map((option) => option.color));
	return {
		colors: product.colors.filter((color) => usedColors.has(color.name)),
		sizes: [...new Set(variants.map((option) => option.size))],
		variants
	};
}

export function optionVariant(options: ProductOptions | undefined, color: string, size: string): Variant | undefined {
	return options?.variants.find((option) => option.color === color && option.size === size)?.variant;
}

export function variantImage(product: Product, variantId: string): string {
	const options = productOptions(product);
	const selected = options?.variants.find((option) => option.variant.id === variantId);
	return options?.colors.find((color) => color.name === selected?.color)?.images?.[0] ?? product.image;
}
