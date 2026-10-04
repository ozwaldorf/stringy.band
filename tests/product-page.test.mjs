import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchProductPage, parseProductPage } from '../src/lib/product-page.ts';

const parseProductImages = (source, handle) => parseProductPage(source, handle).images;

const handle = 'band-mug';
const front = 'https://imgproxy.fourthwall.dev/front.webp';
const back = 'https://imgproxy.fourthwall.dev/back.webp';
const product = { '@type': 'Product', sku: handle, image: [front, back] };
const script = (value) => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
const accordion = (title, content, attributes = '') => `<div class="accordion" ${attributes}><div class="accordion__header"><h2 class="accordion__title">${title}</h2></div><div class="accordion__content">${content}</div></div>`;
const page = (...accordions) => `${script(product)}<div class="product-info__additional-info">${accordions.join('')}</div>`;
const text = (text) => ({ type: 'text', text });
const element = (tag, ...children) => ({ type: 'element', tag, children });

function optionFixture() {
	const productId = '11111111-1111-4111-8111-111111111111';
	const variants = [
		{ id: '22222222-2222-4222-8222-222222222222', color: 'Coal', size: 'S' },
		{ id: '33333333-3333-4333-8333-333333333333', color: 'Natural', size: 'L' }
	];
	const images = [
		{ id: '44444444-4444-4444-8444-444444444444', url: front },
		{ id: '55555555-5555-4555-8555-555555555555', url: back }
	];
	const source = `${script({ ...product, offers: variants.map((variant) => ({ name: `${variant.color}, ${variant.size}`, url: `https://shop.example.com/products/${handle}?variant=${variant.id}` })) })}
		<product-component product-id="${productId}" data-currency="USD">
			<div class="color-swatch"><input data-product-option-type="COLOR" value="Coal"><span class="color-swatch__color" style="background-color:#123456;"></span></div>
			<div class="color-swatch"><input data-product-option-type="COLOR" value="Natural"><span class="color-swatch__color" style="background-color:#eeddcc;"></span></div>
			<div class="product-info__additional-info">${accordion('More details', '<p>Source details</p>')}</div>
		</product-component>`;
	const offer = {
		id: productId,
		handle,
		images,
		variants: variants.map((variant, index) => ({
			id: variant.id,
			options: [{ type: 'COLOR', value: variant.color }, { type: 'SIZE', value: variant.size }],
			imageIds: [images[index].id]
		}))
	};
	return { source, offer, variants };
}

test('parses all matching product photos in order and removes duplicate URLs', () => {
	assert.deepEqual(parseProductImages(script({ ...product, image: [front, back, front] }), handle), [front, back]);
	assert.deepEqual(parseProductImages(script(product) + script({ ...product, image: [back] }), handle), [front, back]);
});

test('accepts single-quoted script types and standard JSON-LD arrays and graphs', () => {
	const page = `<script data-note="a > b" TYPE = 'application/ld+json'>${JSON.stringify({
		'@graph': [{ '@type': 'Organization' }, { ...product, '@type': ['Thing', 'Product'] }]
	})}</script>`;
	assert.deepEqual(parseProductImages(page, handle), [front, back]);
	assert.deepEqual(parseProductImages(script([product]), handle), [front, back]);
});

test('only reads Product nodes with the requested sku', () => {
	const unrelated = { ...product, sku: 'another-mug', image: ['https://example.com/unrelated.webp'] };
	assert.deepEqual(parseProductImages(script([unrelated, product]), handle), [front, back]);
	assert.throws(() => parseProductImages(script(unrelated), handle), /No matching Product images/);
	assert.throws(() => parseProductImages(script({ ...product, '@type': 'Organization' }), handle), /No matching Product images/);
});

test('rejects unsafe, relative, credentialed, and malformed image URLs', () => {
	for (const image of ['http://example.com/image.png', 'javascript:alert(1)', '/image.png', 'https://user:password@example.com/image.png', '', null, {}]) {
		assert.throws(() => parseProductImages(script({ ...product, image: [front, image] }), handle), /Invalid product image URL/);
	}
});

test('rejects missing, empty, and malformed gallery data', () => {
	for (const image of [undefined, [], null, front, {}]) {
		assert.throws(() => parseProductImages(script({ ...product, image }), handle), /Invalid product image data/);
	}
	assert.throws(() => parseProductImages('<html></html>', handle), /No matching Product images/);
	assert.throws(() => parseProductImages('<script type="application/ld+json">{invalid}</script>', handle), /Invalid JSON-LD/);
});

test('ignores ordinary scripts and malformed unrelated metadata without executing markup', () => {
	const unrelated = `<script type="text/javascript">${JSON.stringify(product)}</script>`;
	const attributeValue = `<script data-note=" type='application/ld+json'">${JSON.stringify(product)}</script>`;
	assert.throws(() => parseProductImages(unrelated + attributeValue, handle), /No matching Product images/);
	assert.deepEqual(parseProductImages('<script type="application/ld+json">not JSON</script>' + script(product), handle), [front, back]);
});

test('fetches the product page with a timeout and parses its gallery', async (t) => {
	const pageUrl = 'https://shop.example.com/products/band-mug';
	t.mock.method(globalThis, 'fetch', async (url, options) => {
		assert.equal(url, pageUrl);
		assert.ok(options.signal instanceof AbortSignal);
		return new Response(script(product));
	});
	assert.deepEqual(await fetchProductPage({ url: pageUrl, handle }), { images: [front, back], sections: [] });
});

test('preserves caller cancellation and rejects failed or unsafe page requests', async (t) => {
	const controller = new AbortController();
	controller.abort();
	t.mock.method(globalThis, 'fetch', async (_, options) => {
		assert.equal(options.signal.aborted, true);
		return new Response('', { status: 503, statusText: 'Unavailable' });
	});
	await assert.rejects(fetchProductPage({ url: 'https://shop.example.com/products/band-mug', handle }, controller.signal), /503 Unavailable/);
	await assert.rejects(fetchProductPage({ url: 'http://shop.example.com/products/band-mug', handle }), /Invalid product page URL/);
	await assert.rejects(fetchProductPage({ url: 'https://user:password@shop.example.com/products/band-mug', handle }), /Invalid product page URL/);
});

test('extracts requested sections with paragraphs, lists, and decoded text', () => {
	const result = parseProductPage(page(
		accordion('More details', '<div class="html-formatter"><p>Cotton &amp; <strong>soft</strong></p><ul><li>First</li><li><span>Second</span></li></ul></div>'),
		accordion('Size &amp; Fit', '<p>11&nbsp;oz</p><ol><li>Height: 3.79&Prime;</li></ol>'),
		accordion('Quality Guarantee &amp; Returns', '<p>Unrequested policy</p>')
	), handle);
	assert.deepEqual(result.sections, [
		{ title: 'More details', content: [element('p', text('Cotton & '), element('strong', text('soft'))), element('ul', element('li', text('First')), element('li', text('Second')))] },
		{ title: 'Size & Fit', content: [element('p', text('11\u00a0oz')), element('ol', element('li', text('Height: 3.79\u2033')))] }
	]);
});

test('preserves semantic tables and headings while dropping their attributes', () => {
	const result = parseProductPage(page(accordion('Size & Fit', '<h3 id="measurements">Measurements</h3><h4>Inches</h4><table class="sizes"><thead><tr><th scope="col">Size</th><th>Width</th></tr></thead><tbody><tr><td>S</td><td>18<br><em>approx.</em></td></tr></tbody></table>')), handle);
	assert.deepEqual(result.sections[0].content, [
		element('h3', text('Measurements')),
		element('h4', text('Inches')),
		element('table', element('thead', element('tr', element('th', text('Size')), element('th', text('Width')))), element('tbody', element('tr', element('td', text('S')), element('td', text('18'), element('br'), element('em', text('approx.'))))))
	]);
});

test('excludes hidden elements, sections, and containers without hiding aria-hidden=false', () => {
	const result = parseProductPage(page(
		accordion('More details', '<p>Visible<span hidden>hidden</span><span class="hidden">class</span><span aria-hidden="true">aria</span><span style="display: none !important">display</span><span style="visibility: hidden">visibility</span><span aria-hidden="false"> text</span></p>'),
		accordion('Size & Fit', '<p>Hidden section</p>', 'hidden')
	) + `<div hidden><div class="product-info__additional-info">${accordion('Size & Fit', '<p>Hidden container</p>')}</div></div>`, handle);
	assert.deepEqual(result.sections, [{ title: 'More details', content: [element('p', text('Visible'), text(' text'))] }]);
});

test('removes executable and embedded content and never copies markup attributes', () => {
	const result = parseProductPage(page(accordion('More details', '<p onclick="alert(1)"><a href="javascript:alert(1)">Safe link text</a><script>globalThis.__productPageExecuted = true</script><style>body { display: none }</style><iframe src="https://example.com">Frame text</iframe><img src="invalid" onerror="alert(1)"><svg><text>SVG text</text></svg><object>Object text</object><input value="Input text"><span title="ignored"> &lt;script&gt;literal&lt;/script&gt;</span></p>')), handle);
	assert.deepEqual(result.sections, [{ title: 'More details', content: [element('p', text('Safe link text'), text(' <script>literal</script>'))] }]);
	assert.equal(globalThis.__productPageExecuted, undefined);
});

test('ignores empty, absent, unrelated, and outside sections', () => {
	const result = parseProductPage(page(
		accordion('More details', '<div>  <p><br></p><span hidden>Only hidden text</span></div>'),
		accordion('Size & Fit', '<!-- Empty -->'),
		accordion('Unrelated details', '<p>Outside scope</p>')
	) + accordion('More details', '<p>Outside product information</p>'), handle);
	assert.deepEqual(result.sections, []);
	assert.deepEqual(parseProductPage(script(product), handle).sections, []);
});

test('joins source swatches, structured color and size options, and color images by UUID', () => {
	const { source, offer, variants } = optionFixture();
	const result = parseProductPage(source, handle, offer);
	assert.deepEqual(result.colors, [
		{ name: 'Coal', swatches: ['#123456'], images: [front] },
		{ name: 'Natural', swatches: ['#eeddcc'], images: [back] }
	]);
	assert.deepEqual(result.variantOptions, Object.fromEntries(variants.map(({ id, color, size }) => [id, { title: `${color}, ${size}`, color, size }])));
	assert.deepEqual(result.images, [front, back]);
	assert.equal(result.sections[0].title, 'More details');
});

test('preserves multiple source swatches without inventing colors or relying on mutable handles', () => {
	const { source, offer } = optionFixture();
	offer.handle = 'renamed-product';
	const result = parseProductPage(source.replace('background-color:#123456;', 'background-color:#ABC;').replace('<input data-product-option-type="COLOR" value="Coal">', '<input data-product-option-type="COLOR" value="Coal"><span class="color-swatch__color" style="background-color:#fedcba;"></span>'), handle, offer);
	assert.deepEqual(result.colors[0].swatches, ['#fedcba', '#abc']);
});

test('malformed or stale option metadata falls back to the valid gallery and details', () => {
	const mutations = [
		(offer) => { offer.id = '66666666-6666-4666-8666-666666666666'; },
		(offer) => { offer.variants[0].id = 'invalid'; },
		(offer) => { offer.variants[0].options[0].value = 'Unknown'; },
		(offer) => { offer.variants[0].options.pop(); },
		(offer) => { offer.variants.push(offer.variants[0]); },
		(offer) => { offer.variants[0].imageIds = ['66666666-6666-4666-8666-666666666666']; },
		(offer) => { offer.images[0].url = 'http://example.com/unsafe.png'; },
		(offer) => { offer.images.push(offer.images[0]); },
		(offer) => { offer.variants[0].id = '66666666-6666-4666-8666-666666666666'; }
	];
	for (const mutate of mutations) {
		const { source, offer } = optionFixture();
		mutate(offer);
		assert.deepEqual(parseProductPage(source, handle, offer), parseProductPage(source, handle));
	}
});

test('missing or unsafe swatch styles produce no partial grouping metadata', () => {
	for (const style of ['', 'background-color:red;', 'background-color:url(https://example.com);', 'background-color:#12345;']) {
		const { source, offer } = optionFixture();
		const changed = source.replace('background-color:#123456;', style);
		assert.deepEqual(parseProductPage(changed, handle, offer), parseProductPage(changed, handle));
	}
});

test('fetches the public offer endpoint for exact option and gallery metadata', async (t) => {
	const { source, offer } = optionFixture();
	const requests = [];
	t.mock.method(globalThis, 'fetch', async (url) => {
		requests.push(url);
		return requests.length === 1 ? new Response(source) : Response.json(offer);
	});
	const result = await fetchProductPage({ url: `https://shop.example.com/products/${handle}`, handle });
	assert.deepEqual(requests, [`https://shop.example.com/products/${handle}`, `https://shop.example.com/platform/api/v1/offers/${offer.id}?currency=USD`]);
	assert.equal(result.colors.length, 2);
	assert.equal(Object.keys(result.variantOptions).length, 2);
});

test('option endpoint failures retain the page gallery and detail sections', async (t) => {
	const { source } = optionFixture();
	t.mock.method(globalThis, 'fetch', async (url) => url.includes('/platform/') ? new Response('', { status: 503 }) : new Response(source));
	assert.deepEqual(await fetchProductPage({ url: `https://shop.example.com/products/${handle}`, handle }), parseProductPage(source, handle));
});
