import type { Product, ProductColor, Variant } from './fourthwall';

export type ProductOptions = {
	colors: ProductColor[];
	sizes: string[];
	variants: Array<{ variant: Variant; color: string; size: string }>;
};

export type ProductGroup = Product & { members: Product[] };

export function groupProducts(products: Product[]): ProductGroup[] {
	const groups = new Map<string, Product[]>();
	for (const product of products) {
		const members = groups.get(product.title);
		if (members) members.push(product);
		else groups.set(product.title, [product]);
	}
	return [...groups.values()].map((members) => {
		const first = members[0];
		if (members.length === 1) return { ...first, members };
		const colors = new Map<string, ProductColor>();
		for (const member of members) {
			for (const color of member.colors ?? []) {
				const previous = colors.get(color.name);
				colors.set(color.name, {
					...color,
					swatches: [...new Set([...(previous?.swatches ?? []), ...color.swatches])],
					images: [...new Set([...(previous?.images ?? []), ...(color.images?.length ? color.images : member.images ?? [member.image])])]
				});
			}
		}
		return {
			...first,
			members,
			available: members.some((member) => member.available),
			variants: members.flatMap((member) => member.variants),
			images: [...new Set(members.flatMap((member) => member.images ?? [member.image]))],
			colors: [...colors.values()],
			variantOptions: Object.assign({}, ...members.map((member) => member.variantOptions ?? {}))
		};
	});
}

export function productSource(group: ProductGroup, variantId?: string, colorName?: string, handle?: string): Product {
	return group.members.find((member) => member.variants.some((variant) => variant.id === variantId))
		?? group.members.find((member) => member.colors?.some((color) => color.name === colorName))
		?? group.members.find((member) => member.handle === handle)
		?? group.members[0];
}

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
