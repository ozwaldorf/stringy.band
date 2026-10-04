<script lang="ts">
	import IconInformation from '~icons/carbon/information';
	import IconWarning from '~icons/carbon/warning-alt';
	import IconError from '~icons/carbon/error';

	let {
		title,
		message = '',
		tone = 'info',
		actionLabel = '',
		actionHref = '',
		onaction,
		actionDisabled = false
	}: {
		title: string;
		message?: string;
		tone?: 'info' | 'warning' | 'error';
		actionLabel?: string;
		actionHref?: string;
		onaction?: () => void | Promise<void>;
		actionDisabled?: boolean;
	} = $props();
</script>

<div class="notice" class:warning={tone === 'warning'} class:error={tone === 'error'} role={tone === 'error' ? 'alert' : 'status'} aria-atomic="true">
	<span class="notice-icon" aria-hidden="true">
		{#if tone === 'error'}<IconError />{:else if tone === 'warning'}<IconWarning />{:else}<IconInformation />{/if}
	</span>
	<div class="notice-copy">
		<p class="notice-title">{title}</p>
		{#if message}<p class="notice-message">{message}</p>{/if}
	</div>
	{#if actionLabel}
		<div class="notice-action">
			{#if actionHref}
				<a class="shop-button secondary" href={actionHref}>{actionLabel}</a>
			{:else}
				<button class="shop-button secondary" type="button" onclick={onaction} disabled={actionDisabled}>{actionLabel}</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.notice { --notice-accent: var(--color-info); display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1rem; width: 100%; box-sizing: border-box; margin: 1rem 0; padding: 1rem 1.1rem; border: 1px solid var(--color-border-subtle); border-left: 3px solid var(--notice-accent); border-radius: 4px; background: var(--color-bg-subtle); text-align: left; }
	.warning { --notice-accent: var(--color-warning); }
	.error { --notice-accent: var(--color-danger); }
	.notice-icon { display: flex; flex-shrink: 0; align-self: flex-start; margin-top: 0.1rem; color: var(--notice-accent); font-size: 1.25rem; }
	.notice-copy { flex: 1 1 14rem; min-width: 0; }
	.notice-title { margin: 0; color: var(--color-text); font-size: 0.85rem; font-weight: 600; line-height: 1.5; }
	.notice-message { margin: 0.3rem 0 0; color: var(--color-text-muted); font-size: 0.8rem; line-height: 1.6; overflow-wrap: anywhere; }
	.notice-action { margin-left: auto; max-width: 100%; }
	.notice-action :global(.shop-button) { max-width: 100%; text-align: center; }
	@media (max-width: 520px) {
		.notice { gap: 0.6rem; padding: 0.9rem; }
		.notice-copy { flex: 1 1 0; }
		.notice-action, .notice-action :global(.shop-button) { width: 100%; }
	}
</style>
