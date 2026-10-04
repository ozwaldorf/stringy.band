<script lang="ts">
	let { label, level = 'h2' }: { label: string; level?: 'h1' | 'h2' } = $props();
</script>

<div class="shop-heading" class:page-heading={level === 'h1'}>
	<svelte:element this={level} tabindex={level === 'h1' ? -1 : undefined}>{label}</svelte:element>
</div>

<style>
	.shop-heading {
		text-align: center;
	}

	.shop-heading :is(h1, h2) {
		min-width: 0;
		margin: 0;
		font-size: 1.25rem;
		letter-spacing: 0.14em;
		color: var(--color-text-subtle);
		text-align: center;
	}

	.page-heading h1 {
		font-size: clamp(1.5rem, 3vw, 2rem);
		letter-spacing: 0.08em;
		color: var(--color-text);
	}
</style>
