# stringy.band

Website for the Stringy and the Beans Bluegrass Quartet

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

Vite outputs a static bundle to `build/`, including shop routes and a `404.html` fallback.

```sh
npm run check
npm test
```

Use Node 22.18 or later to run the TypeScript-backed tests.

## Shop

The homepage features a few items and `/shop` shows the complete Fourthwall catalog. Product options and a saved bag are handled on the band site; checkout, shipping, and payment are handled by Fourthwall.

`src/lib/fourthwall.ts` reads the shop's public collection feed, so no API credentials are required. The build saves a catalog snapshot in `src/lib/products.json`. The browser refreshes the catalog on arrival and before checkout, and asks the shopper to review any changed prices or availability. If a refresh fails, saved bag items are retained and checkout offers a retry. The feed reports availability per product; Fourthwall validates individual variants at checkout.

The collection feed supplies one product image and variant names/prices. At build and dev-server startup, product galleries, color swatches, and the visible "More details" and "Size & Fit" sections are read from the public product pages and saved in the catalog snapshot. Fourthwall's public offer data maps color/size choices and photos to variant IDs. Product cards show compact swatches; product pages show selectable colors with separate sizes and matching photos. If option metadata is unavailable or out of date, the full variant names remain selectable. Photos keep Fourthwall's order, and text is rendered as structured content without scripts or source-page styling. Live price refreshes preserve this content; failed product-page fetches keep the previous content or the collection thumbnail. Content changes appear on the next build or dev-server restart. Manage each product's photos, cover image, colors, and details in Fourthwall.

Browsing stays on the band site; checkout is the only Fourthwall handoff. To change the featured homepage selection, edit `featuredHandles` in `src/ShopPreview.svelte`.

Integration references: [public feeds](https://docs.fourthwall.com/shop-apis/shop-feeds) and [checkout links](https://docs.fourthwall.com/shop-apis/cart-checkout-endpoint).

## Deploy

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages.
The site is served at `stringy.band` via the `CNAME` in `public/`.
