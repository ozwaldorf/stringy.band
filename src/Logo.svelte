<script lang="ts">
	import art from './lib/assets/logo.svg?raw';

	let { element = $bindable(), class: className = '' }: { element?: HTMLElement; class?: string } = $props();

	// Each copy gets its own gradient ids, so several logos can share a page
	const id = $props.id();
	const svg = art.replaceAll('logo-gradient-', `${id}-gradient-`);
</script>

<!-- Inline rather than an <img>, so it paints with the page instead of a moment after.
     Decoration only: the link around it names the band. -->
<span class="logo-art {className}" aria-hidden="true" bind:this={element}>{@html svg}</span>

<style>
	.logo-art {
		display: block;
		line-height: 0;
	}

	.logo-art :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
</style>
