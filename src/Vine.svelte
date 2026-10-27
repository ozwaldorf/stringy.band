<script lang="ts">
	import { growVine, leafPath, midribPath, VINE_WIDTH } from './lib/vine';

	let { seed, dry = false }: { seed: number; dry?: boolean } = $props();

	let height = $state(0);
	const vine = $derived(growVine(height, seed, dry));
</script>

<div class="vine" class:dry bind:clientHeight={height} aria-hidden="true">
	{#if height > 0}
		<svg width={VINE_WIDTH} {height} viewBox="0 0 {VINE_WIDTH} {height}">
			<path class="stem" d={vine.stem} />
			{#each vine.leaves as leaf}
				<g transform="translate({leaf.x} {leaf.y}) rotate({leaf.angle})">
					{#if leaf.stub}
						<path class="petiole" d="M0 0 L3 0" />
					{:else}
						<path class="petiole" d="M0 0 L2.5 0" />
						<g transform="translate(2 0)">
							<path class="leaf" class:alt={leaf.tone === 1} d={leafPath(leaf)} />
							<path class="midrib" d={midribPath(leaf)} />
						</g>
					{/if}
				</g>
			{/each}
		</svg>
	{/if}
</div>

<style>
	.vine {
		position: absolute;
		top: 0;
		bottom: 0;
		left: calc(var(--vine-x, 50%) - 22px);
		width: 44px;
		pointer-events: none;
	}

	svg {
		display: block;
		overflow: visible;
	}

	.stem {
		fill: var(--gb-green-dim);
	}

	.petiole {
		stroke: var(--gb-green-dim);
		stroke-width: 1;
		stroke-linecap: round;
	}

	.leaf {
		fill: var(--gb-green);
		stroke: var(--gb-green-dim);
		stroke-width: 0.9;
		stroke-linejoin: round;
	}

	.leaf.alt {
		fill: var(--gb-aqua);
	}

	.midrib {
		fill: none;
		stroke: var(--gb-green-dim);
		stroke-width: 0.6;
		opacity: 0.7;
	}

	.dry .stem {
		fill: var(--gb-gray);
	}

	.dry .petiole,
	.dry .leaf,
	.dry .midrib {
		stroke: var(--gb-gray);
	}

	.dry .leaf {
		fill: var(--gb-bg4);
	}

	.dry .leaf.alt {
		fill: var(--gb-yellow-dim);
		opacity: 0.7;
	}
</style>
