# stringy.beans

Site for Stringy and the Beans. Static SvelteKit SPA.

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

Outputs a static bundle to `build/` via `@sveltejs/adapter-static` with a `404.html` SPA fallback. Preview with `npm run preview`.

## Deploy

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages. The site is served at `stringy.band` via the `CNAME` in `static/`.
