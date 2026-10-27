<script lang="ts">
	import BandPhoto from './BandPhoto.svelte';
	import { landscapePhotos, portraitPhotos, type Photo } from './lib/photos';

	// Fisher-Yates, so each visit opens on a different set
	function shuffled(entries: Photo[]): { src: string; caption: string }[] {
		const photos = entries.map(({ name, caption }) => ({ src: `/images/${name}.webp`, caption }));
		for (let i = photos.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[photos[i], photos[j]] = [photos[j], photos[i]];
		}
		return photos;
	}

	const landscape = shuffled(landscapePhotos);
	const portrait = shuffled(portraitPhotos);

	// The two landscape prints split their photos so they never show the same one
	const prints = [
		landscape.filter((_, i) => i % 2 === 0),
		portrait,
		landscape.filter((_, i) => i % 2 === 1)
	];

	// Each print holds its photo this long; one clock steps the prints in turn
	const INTERVAL = 6000;

	let indexes = $state(prints.map(() => 0));
	let tick = 0;
	let collage: HTMLElement | undefined = $state();
	let visible = $state(false);

	$effect(() => {
		if (!collage) return;
		const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
		observer.observe(collage);
		return () => observer.disconnect();
	});

	$effect(() => {
		if (!visible) return;
		const timer = setInterval(() => {
			if (document.hidden) return;
			const print = tick++ % prints.length;
			indexes[print] = (indexes[print] + 1) % prints[print].length;
		}, INTERVAL / prints.length);
		return () => clearInterval(timer);
	});
</script>

<div class="band-photos" bind:this={collage}>
	<BandPhoto class="first" photos={prints[0]} index={indexes[0]} />
	<BandPhoto class="second" sideways photos={prints[1]} index={indexes[1]} />
	<BandPhoto class="third" photos={prints[2]} index={indexes[2]} />
</div>

<style>
	/* Three overlapping prints scattered down the column */
	.band-photos {
		position: relative;
		width: min(38rem, 100%);
		aspect-ratio: 1;
		margin-bottom: 1rem;
	}

	.band-photos :global(.band-photo) {
		position: absolute;
		width: 56%;
	}

	.band-photos :global(.first) {
		top: 0;
		left: 0;
		--tilt: -2deg;
		--tape-tilt: 3deg;
	}

	/* On its side, as wide as the others are tall: their 56% width at 4:3 plus the borders */
	.band-photos :global(.second) {
		top: 18%;
		right: 4%;
		z-index: 1;
		width: calc(56% * 0.75 + 2.8 * 0.75rem);
		--tilt: 3deg;
		--tape-tilt: -4deg;
	}

	.band-photos :global(.third) {
		bottom: -1rem;
		left: 6%;
		z-index: 2;
		--tilt: 3deg;
		--tape-tilt: -2deg;
	}

	/* Past the column edge only where there is room, so phones never scroll sideways */
	@media (min-width: 700px) {
		.band-photos :global(.second) {
			right: -2%;
		}
	}
</style>
