import assert from 'node:assert/strict';
import { test } from 'node:test';

import { optionVariant, productOptions, variantImage } from '../src/lib/product-options.ts';

function product() {
	const variants = [
		{ id: '11111111-1111-4111-8111-111111111111', title: 'Moss, S', price: 3000, currency: 'USD' },
		{ id: '22222222-2222-4222-8222-222222222222', title: 'Moss, 2XL', price: 3200, currency: 'USD' },
		{ id: '33333333-3333-4333-8333-333333333333', title: 'Ivory, S', price: 3100, currency: 'USD' }
	];
	return {
		id: '44444444-4444-4444-8444-444444444444',
		handle: 'band-tee',
		title: 'Band tee',
		url: 'https://shop.stringy.band/products/band-tee',
		image: 'https://imgproxy.fourthwall.dev/tee.webp',
		available: true,
		variants,
		colors: [
			{ name: 'Ivory', swatches: ['#fef1d0'], images: ['https://imgproxy.fourthwall.dev/ivory.webp'] },
			{ name: 'Unused', swatches: ['#000000'] },
			{ name: 'Moss', swatches: ['#6b7053'] }
		],
		variantOptions: {
			[variants[0].id]: { title: 'Moss, S', color: 'Moss', size: 'S' },
			[variants[1].id]: { title: 'Moss, 2XL', color: 'Moss', size: '2XL' },
			[variants[2].id]: { title: 'Ivory, S', color: 'Ivory', size: 'S' }
		}
	};
}

test('retains source color order, distinct sizes, gallery metadata and current variant prices', () => {
	const value = product();
	const options = productOptions(value);
	assert.deepEqual(options.colors, [value.colors[0], value.colors[2]]);
	assert.deepEqual(options.sizes, ['S', '2XL']);
	assert.equal(optionVariant(options, 'Moss', 'S'), value.variants[0]);
	assert.equal(optionVariant(options, 'Moss', '2XL').price, 3200);
	assert.equal(optionVariant(options, 'Ivory', 'S').price, 3100);
});

test('never substitutes a different size or color for a missing combination', () => {
	const options = productOptions(product());
	assert.equal(optionVariant(options, 'Ivory', '2XL'), undefined);
	assert.equal(optionVariant(options, 'moss', 'S'), undefined);
	assert.equal(optionVariant(options, 'Unknown', 'S'), undefined);
	assert.equal(optionVariant(options, 'Moss', ''), undefined);
	assert.equal(optionVariant(undefined, 'Moss', 'S'), undefined);
});

test('falls back when color or variant metadata is missing or stale', () => {
	for (const change of [
		(value) => delete value.colors,
		(value) => delete value.variantOptions,
		(value) => delete value.variantOptions[value.variants[0].id],
		(value) => { value.variantOptions[value.variants[0].id].title = 'Previous title'; },
		(value) => { value.variantOptions[value.variants[0].id].color = 'Unknown'; },
		(value) => { value.variantOptions[value.variants[0].id].size = ''; },
		(value) => { value.variants = []; }
	]) {
		const value = product();
		change(value);
		assert.equal(productOptions(value), undefined);
	}
});

test('rejects ambiguous color definitions and duplicate color-size combinations', () => {
	const duplicateColor = product();
	duplicateColor.colors.push({ name: 'Moss', swatches: ['#111111'] });
	assert.equal(productOptions(duplicateColor), undefined);
	const duplicateCombination = product();
	duplicateCombination.variantOptions[duplicateCombination.variants[1].id].size = 'S';
	assert.equal(productOptions(duplicateCombination), undefined);
});

test('supports one color and ignores metadata for removed variants', () => {
	const value = product();
	value.variants = value.variants.slice(0, 2);
	const options = productOptions(value);
	assert.deepEqual(options.colors.map((color) => color.name), ['Moss']);
	assert.deepEqual(options.sizes, ['S', '2XL']);
	assert.equal(optionVariant(options, 'Ivory', 'S'), undefined);
});

test('uses the selected color image and falls back when that color has no image', () => {
	const value = product();
	assert.equal(variantImage(value, value.variants[2].id), 'https://imgproxy.fourthwall.dev/ivory.webp');
	assert.equal(variantImage(value, value.variants[0].id), value.image);
	assert.equal(variantImage(value, 'removed-variant'), value.image);
});

test('does not use stale option metadata to choose a variant image', () => {
	const value = product();
	value.variantOptions[value.variants[2].id].title = 'Previous color, S';
	assert.equal(variantImage(value, value.variants[2].id), value.image);
	delete value.variantOptions;
	assert.equal(variantImage(value, value.variants[2].id), value.image);
});
