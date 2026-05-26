<script lang="ts">
	import data from './lib/videos.json';

	const CYCLE_MS = 15_000;

	function shuffle<T>(items: readonly T[]): T[] {
		const out = items.slice();
		for (let i = out.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[out[i], out[j]] = [out[j], out[i]];
		}
		return out;
	}

	const videos = shuffle(data.videos);

	let index = $state(0);
	let interacted = $state(false);

	const current = $derived(videos[index]);

	// Two iframe slots crossfade: the active slot is visible, the other loads
	// the next video underneath and fades in once its player is ready.
	type Slot = (typeof videos)[number] | undefined;
	let slots = $state<[Slot, Slot]>([videos[0], undefined]);
	let active = $state(0);

	function go(delta: number) {
		if (videos.length <= 1) return;
		index = (index + delta + videos.length) % videos.length;
	}

	function jumpTo(i: number) {
		interacted = true;
		index = i;
	}

	$effect(() => {
		const next = current;
		const incoming = active ^ 1;
		if (slots[incoming]?.id === next.id || slots[active]?.id === next.id) return;
		slots[incoming] = next;
	});

	function onLoaded(slot: number) {
		// Reveal the slot only once it holds the current video and is hidden.
		if (slot !== active && slots[slot]?.id === current.id) active = slot;
	}

	// Dots track the visible video, not the pending one.
	const showingIndex = $derived(videos.findIndex((v) => v.id === (slots[active] ?? current).id));

	function stop() {
		interacted = true;
	}

	$effect(() => {
		if (interacted || videos.length <= 1) return;
		const id = setInterval(() => go(1), CYCLE_MS);
		return () => clearInterval(id);
	});

	let frame = $state<HTMLElement>();

	$effect(() => {
		if (!frame) return;
		// Clicking into the embedded player steals focus from the window.
		const onBlur = () => {
			if (document.activeElement?.tagName === 'IFRAME') stop();
		};
		const onPointer = (e: PointerEvent) => {
			if (frame?.contains(e.target as Node)) stop();
		};
		window.addEventListener('blur', onBlur);
		window.addEventListener('pointerdown', onPointer);
		return () => {
			window.removeEventListener('blur', onBlur);
			window.removeEventListener('pointerdown', onPointer);
		};
	});
</script>

{#if current}
	<section aria-label="Videos">
		<h1>Latest Videos</h1>
		<div class="frame" bind:this={frame}>
			<div class="mat">
				<div class="screen">
					{#each slots as slot, i (i)}
						{#if slot}
							{#key slot.id}
								<iframe
									class="layer"
									class:visible={i === active}
									src={`https://www.youtube-nocookie.com/embed/${slot.id}?rel=0`}
									title={slot.title}
									loading="lazy"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
									referrerpolicy="strict-origin-when-cross-origin"
									allowfullscreen
									onload={() => onLoaded(i)}
								></iframe>
							{/key}
						{/if}
					{/each}
				</div>
			</div>
		</div>
		{#if videos.length > 1}
			<div class="dots">
				{#each videos as video, i (video.id)}
					<button
						type="button"
						class="dot"
						class:active={i === showingIndex}
						aria-label={`Play video ${i + 1}`}
						aria-current={i === showingIndex}
						onclick={() => jumpTo(i)}
					></button>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<style>
	section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		margin-top: 1.5rem;
		width: 100%;
	}

	h1 {
		margin: 0;
		font-size: 1.25rem;
		letter-spacing: 0.14em;
		color: var(--color-text-subtle);
	}

	.frame {
		width: min(560px, 100%);
		padding: 1.1rem;
		border-radius: 6px;
		background:
			linear-gradient(135deg, var(--gb-yellow) 0%, var(--gb-orange) 45%, var(--gb-yellow-dim) 100%);
		box-shadow:
			inset 0 0 0 2px var(--gb-orange-dim),
			inset 0 0 0 6px var(--gb-yellow),
			inset 0 0 0 8px var(--gb-yellow-dim),
			0 10px 28px rgba(40, 40, 40, 0.35);
	}

	.mat {
		padding: 0.6rem;
		border-radius: 2px;
		background: var(--gb-bg0-h);
		box-shadow: inset 0 0 0 1px var(--color-border);
	}

	.screen {
		position: relative;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		border-radius: 1px;
		background: var(--gb-fg0);
		box-shadow: 0 1px 4px rgba(40, 40, 40, 0.4);
	}

	.screen .layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		opacity: 0;
		transition: opacity 400ms ease;
		pointer-events: none;
	}

	.screen .layer.visible {
		opacity: 1;
		pointer-events: auto;
	}

	.dots {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.15rem;
	}

	.dot {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
	}

	.dot::before {
		content: '';
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--color-border);
		transition: background-color 200ms ease, transform 200ms ease;
	}

	.dot:hover::before {
		background: var(--gb-orange);
		transform: scale(1.3);
	}

	.dot.active::before {
		background: var(--gb-orange-dim);
		transform: scale(1.3);
	}
</style>
