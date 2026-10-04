<script lang="ts">
	let { swatches, compact = false }: { swatches: string[]; compact?: boolean } = $props();
	const background = $derived(swatches.length === 1 ? swatches[0] : `linear-gradient(135deg, ${swatches.map((color, index) => `${color} ${index * 100 / swatches.length}% ${(index + 1) * 100 / swatches.length}%`).join(', ')})`);
</script>

<span class="swatch" class:compact style:background aria-hidden="true"></span>

<style>
	.swatch { display: block; flex-shrink: 0; width: 1.625rem; height: 1.625rem; border: 1px solid var(--color-border); border-radius: 50%; box-sizing: border-box; }
	.compact { width: 0.8rem; height: 0.8rem; }
</style>
