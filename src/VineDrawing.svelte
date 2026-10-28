<script lang="ts">
	import { growRoots, growVine, leafPath, midribPath, VINE_WIDTH, type Bean, type Leaf } from './lib/vine';

	let {
		length,
		seed,
		roots = false,
		sideways = false,
		trailing = false,
		grow,
		delay = 0,
		grown = $bindable(false),
		duration = $bindable(0),
		skipped = $bindable(false)
	}: {
		length: number;
		seed: number;
		/** Grows a root system instead of a leafy vine */
		roots?: boolean;
		sideways?: boolean;
		trailing?: boolean;
		/** Starts growing when this turns true, instead of when the vine scrolls into view */
		grow?: boolean;
		/** Seconds to wait before growing, so one vine can carry on where another ends */
		delay?: number;
		grown?: boolean;
		duration?: number;
		/** Set when a link glide carried the page past it, so it appeared already grown */
		skipped?: boolean;
	} = $props();

	// On its side the vine's own +x points down the screen, so beans hang toward 0 instead of 90
	const vine = $derived(
		growVine(length, seed, { hang: sideways ? 0 : 90, podSize: sideways ? 0.55 : 1, trailing })
	);
	const rootSystem = $derived(roots ? growRoots(length, seed) : undefined);
	// On its side the vine grows leftward, so its thick base sits at the right end
	const [width, height] = $derived(sideways ? [length, VINE_WIDTH] : [VINE_WIDTH, length]);

	// Grows out once, the first time it scrolls into view; longer vines take a little longer
	const clipId = $props.id();
	const growFor = $derived(Math.min(2.6, 0.9 + length / 500));
	let svg: SVGSVGElement | undefined = $state();

	$effect(() => {
		duration = growFor;
	});

	$effect(() => {
		if (grow) grown = true;
	});

	// A link glide holds off growth until it lands: vines it carried past appear
	// grown, the ones still in view grow then
	$effect(() => {
		if (!svg || grown) return;
		const own = grow === undefined;
		let gliding = document.documentElement.classList.contains('gliding');
		let inView = false;
		let crossed = false;
		const observer = new IntersectionObserver(
			([entry]) => {
				inView = entry.isIntersecting;
				if (!inView) return;
				if (gliding) crossed = true;
				else if (own) grown = true;
			},
			{ threshold: 0.15 }
		);
		const onGlideStart = () => {
			gliding = true;
			crossed = inView;
		};
		const onGlideEnd = () => {
			gliding = false;
			if (crossed && !inView) skipped = grown = true;
			else if (inView && own) grown = true;
		};
		observer.observe(svg);
		window.addEventListener('glidestart', onGlideStart);
		window.addEventListener('glideend', onGlideEnd);
		return () => {
			observer.disconnect();
			window.removeEventListener('glidestart', onGlideStart);
			window.removeEventListener('glideend', onGlideEnd);
		};
	});

	// When the growing tip reaches a leaf or bean, as a share of the whole growth
	const reached = (y: number) => (length ? Math.min(1, y / length) : 0);
</script>

<svg
	class:roots
	class:grown
	class:skipped
	style="--grow-for: {growFor}s; --grow-delay: {delay}s"
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	preserveAspectRatio="xMaxYMid slice"
	aria-hidden="true"
	bind:this={svg}
>
	<defs>
		<clipPath id={clipId}>
			<!-- Wider than the vine, so leaves never brush its edges -->
			<rect class="growth" x={-VINE_WIDTH} y="0" width={VINE_WIDTH * 3} height={length} />
		</clipPath>
	</defs>
	<g transform={sideways ? `translate(${length} 0) rotate(90)` : undefined}>
		{#if rootSystem}
			<path class="taproot" d={rootSystem.taproot} clip-path="url(#{clipId})" />
			{#each rootSystem.rootlets as rootlet}
				<g transform="translate({rootlet.x} {rootlet.y})">
					<path class="sprout rootlet" style="--at: {reached(rootlet.y)}" d={rootlet.path} />
				</g>
			{/each}
		{:else}
			<path class="stem" d={vine.stem} clip-path="url(#{clipId})" />
			<!-- Leaves a bean hangs across sit under every bean, so the pod never seems to cut the leaf off -->
			{#each vine.leaves.filter((leaf) => leaf.under) as leaf}
				{@render foliage(leaf)}
			{/each}
			{#each vine.beans.filter((bean) => !bean.front) as bean}
				{@render pod(bean)}
			{/each}
			{#each vine.leaves.filter((leaf) => !leaf.under) as leaf}
				{@render foliage(leaf)}
			{/each}
			<!-- Some beans hang in front of the leaves, so they weave through the foliage -->
			{#each vine.beans.filter((bean) => bean.front) as bean}
				{@render pod(bean)}
			{/each}
		{/if}
	</g>
</svg>

{#snippet foliage(leaf: Leaf)}
	<g transform="translate({leaf.x} {leaf.y}) rotate({leaf.angle})">
		<g class="sprout" style="--at: {reached(leaf.y)}">
			<path class="petiole" d="M0 0 L2.5 0" />
			<g transform="translate(2 0)">
				<path class="leaf" class:alt={leaf.tone === 1} d={leafPath(leaf)} />
				<path class="midrib" d={midribPath(leaf)} />
			</g>
		</g>
	</g>
{/snippet}

{#snippet pod(bean: Bean)}
	<g class="bean" transform="translate({bean.x} {bean.y}) rotate({bean.angle})">
		<!-- Beans set a moment after the leaves around them -->
		<g class="sprout" style="--at: {reached(bean.y)}; --late: 0.25s">
			<path class="stalk" d={bean.stalk} />
			<path class="tail" d={bean.tail} />
			<path class="pod" d={bean.body} />
			<path class="seam" d={bean.seam} />
			<path class="shine" d={bean.highlight} />
			<path class="cap" d={bean.cap} />
		</g>
	</g>
{/snippet}

<style>
	svg {
		display: block;
		overflow: visible;
	}

	/* The stem is uncovered from its base as the clip grows along it */
	.growth {
		transform: scaleY(0);
		transition: transform var(--grow-for) linear var(--grow-delay);
	}

	.grown .growth {
		transform: none;
	}

	/* Each leaf and bean unfurls from where it meets the stem, as the tip passes */
	.sprout {
		transform: scale(0);
		transition: transform 450ms cubic-bezier(0.34, 1.4, 0.64, 1);
		transition-delay: calc(var(--grow-delay) + var(--at) * var(--grow-for) + var(--late, 0s));
	}

	.grown .sprout {
		transform: none;
	}

	.skipped .growth,
	.skipped .sprout {
		transition: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.growth,
		.sprout {
			transform: none;
			transition: none;
		}
	}

	.stem {
		fill: var(--logo-green);
	}

	.petiole {
		stroke: var(--logo-green);
		stroke-width: 1;
		stroke-linecap: round;
	}

	.pod {
		fill: var(--logo-green);
		stroke: var(--logo-green-mid);
		stroke-width: 0.6;
		stroke-linejoin: round;
	}

	.stalk,
	.tail {
		fill: none;
		stroke: var(--logo-green-mid);
		stroke-linecap: round;
	}

	.stalk {
		stroke-width: 1;
	}

	.tail {
		stroke-width: 0.5;
	}

	/* Rounds the pod: light along its upper flank, the seam shaded along the lower */
	.shine,
	.seam {
		fill: none;
		stroke-linecap: round;
	}

	.shine {
		stroke: var(--logo-green-light);
		stroke-width: 0.8;
		opacity: 0.75;
	}

	.seam {
		stroke: var(--logo-green-mid);
		stroke-width: 0.45;
		opacity: 0.7;
	}

	.cap {
		fill: var(--logo-green-mid);
		stroke: var(--logo-green-mid);
		stroke-width: 0.3;
		stroke-linejoin: round;
	}

	.leaf {
		fill: var(--logo-green-light);
		stroke: var(--logo-green-mid);
		stroke-width: 0.9;
		stroke-linejoin: round;
	}

	.leaf.alt {
		fill: var(--logo-green);
	}

	.midrib {
		fill: none;
		stroke: var(--logo-green-mid);
		stroke-width: 0.6;
		opacity: 0.7;
	}

	/* Roots, in the earthy tones of the ground they grow through */
	.taproot {
		fill: var(--gb-fg4);
	}

	.rootlet {
		fill: var(--gb-gray);
	}

</style>
