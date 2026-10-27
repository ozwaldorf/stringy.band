<script lang="ts">
	import VineDrawing from './VineDrawing.svelte';

	let {
		seed,
		roots = false,
		grow,
		delay = 0,
		grown = $bindable(false),
		duration = $bindable(0)
	}: {
		seed: number;
		roots?: boolean;
		grow?: boolean;
		delay?: number;
		grown?: boolean;
		duration?: number;
	} = $props();

	// Drawn a little smaller than full size, then grown over the column's full height
	const SCALE = 0.85;

	let height = $state(0);
</script>

<div class="vine" bind:clientHeight={height} aria-hidden="true">
	{#if height > 0}
		<div class="scaled" style="--scale: {SCALE}">
			<VineDrawing length={height / SCALE} {seed} {roots} {grow} {delay} bind:grown bind:duration />
		</div>
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

	.scaled {
		transform: scale(var(--scale));
		transform-origin: top center;
	}
</style>
