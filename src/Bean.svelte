<script lang="ts">
	import beanA from './lib/assets/bean-a.svg?raw';
	import beanB from './lib/assets/bean-b.svg?raw';

	let {
		which = 'a',
		size = '5rem',
		dance = false,
		class: className = ''
	}: { which?: 'a' | 'b'; size?: string; dance?: boolean; class?: string } = $props();
</script>

<!-- Drawn inline rather than as an <img>, so tilting or mirroring a bean redraws the
     vector instead of resampling a bitmap of it. Decoration only. -->
<span class="bean {className}" class:dance class:b={which === 'b'} aria-hidden="true" style="--size: {size}">
	{@html which === 'b' ? beanB : beanA}
</span>

<style>
	.bean {
		display: block;
		width: var(--size);
		line-height: 0;
		pointer-events: none;
		user-select: none;
	}

	.bean :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}

	/* A little side to side shuffle; the two beans step out of time with each other */
	.dance {
		transform-origin: 50% 100%;
		animation: shuffle 1.6s ease-in-out infinite alternate;
	}

	.dance.b {
		animation-delay: -0.8s;
	}

	@keyframes shuffle {
		from {
			transform: rotate(-6deg) translateY(0);
		}
		50% {
			transform: rotate(0deg) translateY(-3px);
		}
		to {
			transform: rotate(6deg) translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.dance {
			animation: none;
		}
	}
</style>
