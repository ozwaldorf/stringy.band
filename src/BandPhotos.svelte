<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import BandPhoto from './BandPhoto.svelte';
	import Bean from './Bean.svelte';
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

	// The print in hand, and the one whose spot stays empty until it has been set back down
	let held: number | null = $state(null);
	let lifted: number | null = $state(null);
	let elements: (HTMLElement | undefined)[] = $state([]);
	let backdrop: HTMLButtonElement | undefined = $state();

	$effect(() => {
		if (!visible) return;
		const timer = setInterval(() => {
			if (document.hidden || lifted !== null) return;
			const print = tick++ % prints.length;
			indexes[print] = (indexes[print] + 1) % prints[print].length;
		}, INTERVAL / prints.length);
		return () => clearInterval(timer);
	});

	$effect(() => {
		if (held !== null) backdrop?.focus();
	});

	let pickedAt = 0;

	// The held copy is laid out at the print's own size and only scaled up, so it starts
	// as an exact match for the print in the collage: borders, caption and all
	let heldWidth = $state(0);
	let heldScale = $state(1);
	let heldTape = $state('');

	function pickUp(print: number) {
		const source = elements[print];
		if (!source) return;
		const { offsetWidth: width, offsetHeight: height } = source;
		heldWidth = width;
		// Its tape angle comes from its spot in the collage, which the copy is drawn outside of
		heldTape = getComputedStyle(source).getPropertyValue('--tape-tilt');
		heldScale = Math.min((innerWidth * 0.92) / width, (innerHeight * 0.88) / height, 896 / width);
		held = lifted = print;
		pickedAt = performance.now();
	}

	function putDown() {
		// A Space press picks up on keyup, which would land on the backdrop and drop it again
		if (held === null || performance.now() - pickedAt < 250) return;
		const print = held;
		held = null;
		elements[print]?.querySelector('button')?.focus({ preventScroll: true });
	}

	// Shadow of a print held off the page, grown in as it lifts
	const heldShadow = (t: number) =>
		`drop-shadow(0 ${(12 * t).toFixed(1)}px ${(20 * t).toFixed(1)}px rgba(40, 28, 16, ${(0.4 * t).toFixed(3)}))`;

	// Flies the held print between its spot in the collage and the middle of the screen
	function lift(node: HTMLElement, { source, scale }: { source?: HTMLElement; scale: number }) {
		if (!source) return {};
		const from = source.getBoundingClientRect();
		const to = node.getBoundingClientRect();
		const dx = from.left + from.width / 2 - (to.left + to.width / 2);
		const dy = from.top + from.height / 2 - (to.top + to.height / 2);
		const tilt = (parseFloat(getComputedStyle(source).getPropertyValue('--tilt')) || 0) - HELD_TILT;
		// A print picked up from under the pointer is already pulled out a little
		const start = source.matches(':has(> .pick:hover)')
			? parseFloat(getComputedStyle(source).getPropertyValue('--pull-scale')) || 1
			: 1;
		return {
			duration: prefersReducedMotion.current ? 0 : 450,
			easing: cubicOut,
			css: (t: number, u: number) => `
				transform: translate(${dx * u}px, ${dy * u}px) scale(${start + (scale - start) * t}) rotate(${tilt * u}deg);
				filter: ${heldShadow(t)};
			`
		};
	}

	const HELD_TILT = -1;

	// Ancestors that transform the page would trap a fixed overlay, so it lives on <body>;
	// Svelte still removes it there once its outro finishes
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
	}
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && putDown()} />

<div class="band-photos" bind:this={collage}>
	{#each ['first', 'second', 'third'] as name, print (name)}
		<BandPhoto
			class={name}
			sideways={print === 1}
			photos={prints[print]}
			index={indexes[print]}
			onpick={() => pickUp(print)}
			style={lifted === print ? 'visibility: hidden' : ''}
			bind:element={elements[print]}
		/>
	{/each}
	<span class="corner-bean"><Bean which="a" size="4.25rem" /></span>
</div>

{#if held !== null && lifted !== null}
	<!-- Reads `lifted`, which outlasts `held` until the print is back in its spot, so the outro knows where to fly -->
	<div use:portal>
		<button
			class="backdrop"
			aria-label="Put the photo down"
			onclick={putDown}
			bind:this={backdrop}
			transition:fade={{ duration: prefersReducedMotion.current ? 0 : 300 }}
		></button>
		<div class="held" style="--tilt: {HELD_TILT}deg">
			<div
				style="transform: scale({heldScale}); filter: {heldShadow(1)}"
				transition:lift={{ source: elements[lifted], scale: heldScale }}
				onoutroend={() => (lifted = null)}
			>
				<BandPhoto
					sideways={lifted === 1}
					photos={prints[lifted]}
					index={indexes[lifted]}
					style="width: {heldWidth}px; --tape-tilt: {heldTape}"
				/>
			</div>
		</div>
	</div>
{/if}

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

	/* In the open corner below the portrait print and beside the last one */
	.corner-bean {
		position: absolute;
		right: 22%;
		bottom: 8%;
		rotate: -12deg;
		pointer-events: none;
	}

	.band-photos :global(.third) {
		bottom: -1rem;
		left: 6%;
		z-index: 2;
		--tilt: 3deg;
		--tape-tilt: -2deg;
	}

	/* Dims the page behind the print in hand; a click anywhere sets it back down */
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		padding: 0;
		border: none;
		background: rgba(40, 28, 16, 0.6);
		cursor: pointer;
	}

	.held {
		position: fixed;
		inset: 0;
		z-index: 101;
		display: grid;
		place-items: center;
		pointer-events: none;
	}

	/* Past the column edge only where there is room, so phones never scroll sideways */
	@media (min-width: 700px) {
		.band-photos :global(.second) {
			right: -2%;
		}
	}
</style>
