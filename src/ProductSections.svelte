<script lang="ts">
	import type { ProductContentNode, ProductSection } from './lib/fourthwall';

	let { sections }: { sections: ProductSection[] } = $props();
	const contentTags = new Set(['p', 'ul', 'ol', 'li', 'strong', 'em', 'thead', 'tbody', 'tr', 'th', 'td', 'h3', 'h4']);
</script>

{#snippet content(nodes: ProductContentNode[], title: string)}
	{#each nodes as node}
		{#if node.type === 'text'}
			{node.text}
		{:else if node.tag === 'br'}
			<br />
		{:else if node.tag === 'table'}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable tables need keyboard access.) -->
			<div class="table-scroll" role="region" aria-label={`${title} table`} tabindex="0">
				<table>{@render content(node.children, title)}</table>
			</div>
		{:else if contentTags.has(node.tag)}
			<svelte:element this={node.tag}>{@render content(node.children, title)}</svelte:element>
		{/if}
	{/each}
{/snippet}

<section class="product-sections" aria-label="Product information">
	{#each sections as section}
		<details>
			<summary>{section.title}</summary>
			<div class="content">{@render content(section.content, section.title)}</div>
		</details>
	{/each}
</section>

<style>
	.product-sections { min-width: 0; margin-top: 1.25rem; }
	details { border-top: 1px solid var(--color-border-subtle); }
	details:last-child { border-bottom: 1px solid var(--color-border-subtle); }
	summary { min-height: 2.75rem; padding: 0.7rem 0; box-sizing: border-box; color: var(--color-text); font-size: 0.85rem; font-weight: 600; cursor: pointer; }
	summary::marker { color: var(--color-text-subtle); font-size: 0.8em; }
	summary:hover { color: var(--color-link-hover); }
	summary:focus-visible, .table-scroll:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }
	.content { min-width: 0; padding-bottom: 1rem; color: var(--color-text-muted); font-size: 0.8rem; line-height: 1.65; overflow-wrap: anywhere; }
	.content :global(p) { margin: 0.5rem 0; }
	.content :global(ul), .content :global(ol) { margin: 0.5rem 0; padding-left: 1.25rem; }
	.content :global(li) { margin: 0.2rem 0; }
	.content :global(strong) { color: var(--color-text); font-weight: 600; }
	.content :global(h3), .content :global(h4) { margin: 0.9rem 0 0.35rem; color: var(--color-text); font-size: 0.85rem; font-weight: 600; line-height: 1.5; text-transform: none; letter-spacing: 0; }
	.content > :global(:first-child) { margin-top: 0; }
	.content > :global(:last-child) { margin-bottom: 0; }
	.table-scroll { max-width: 100%; overflow-x: auto; margin: 0.75rem 0; border: 1px solid var(--color-border-subtle); border-radius: 2px; }
	table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
	.table-scroll :global(th), .table-scroll :global(td) { padding: 0.45rem 0.6rem; border-bottom: 1px solid var(--color-border-subtle); text-align: left; white-space: nowrap; }
	.table-scroll :global(th) { color: var(--color-text); background: var(--color-bg-subtle); font-weight: 600; }
	.table-scroll :global(tr:last-child td) { border-bottom: 0; }
</style>
