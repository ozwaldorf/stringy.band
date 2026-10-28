<script lang="ts">
	import { onMount, tick } from 'svelte';
	import IconLaunch from '~icons/carbon/launch';
	import IconLocation from '~icons/carbon/location';
	import IconInstagram from '~icons/carbon/logo-instagram';
	import IconTicket from '~icons/carbon/ticket';
	import data from './lib/shows.json';
	import type { Show } from './lib/bandsintown';
	import Vine from './Vine.svelte';
	import SectionHeading from './SectionHeading.svelte';
	import Bean from './Bean.svelte';

	const all: Show[] = data.shows.map((s) => ({
		...s,
		start: new Date(s.start),
		end: new Date(s.end)
	}));
	const now = Date.now();
	const upcoming = all.filter((s) => s.end.getTime() >= now);
	const past = all.filter((s) => s.end.getTime() < now).reverse();

	// A fresh vine each visit
	const vineSeed = Math.floor(Math.random() * 2 ** 32);
	// The past vine carries on growing where the upcoming one leaves off
	let upcomingGrown = $state(false);
	let upcomingGrowFor = $state(0);
	let upcomingSkipped = $state(false);


	const PAST_LIMIT = 5;
	let pastExpanded = $state(false);
	const visiblePast = $derived(pastExpanded ? past : past.slice(0, PAST_LIMIT));

	onMount(() => {
		const anchor = window.location.hash.slice(1);
		if (!all.some((s) => s.anchor === anchor)) return;
		if (past.slice(PAST_LIMIT).some((s) => s.anchor === anchor)) pastExpanded = true;
		const scroll = () => document.getElementById(anchor)?.scrollIntoView({ block: 'center' });
		void tick().then(scroll);
		// Images and fonts above can shift the row once they load
		if (document.readyState !== 'complete') window.addEventListener('load', scroll, { once: true });
	});

	const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
	const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short' });
	const timeFmt = new Intl.DateTimeFormat(undefined, {
		hour: 'numeric',
		minute: '2-digit'
	});

	function ordinal(n: number): string {
		const rem100 = n % 100;
		if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
		switch (n % 10) {
			case 1:
				return `${n}st`;
			case 2:
				return `${n}nd`;
			case 3:
				return `${n}rd`;
			default:
				return `${n}th`;
		}
	}

	function formatDate(d: Date): string {
		return `${weekdayFmt.format(d)}, ${monthFmt.format(d)} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
	}

	function formatDateShort(d: Date): string {
		return `${weekdayFmt.format(d)}, ${monthFmt.format(d)} ${ordinal(d.getDate())}`;
	}

	function mapLink(location: string): string {
		return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
	}

	function lettersOnly(s: string): string {
		return s.toLowerCase().replace(/[^a-z]/g, '');
	}

	function venueInSummary(summary: string, venue?: string): boolean {
		if (!venue) return false;
		return lettersOnly(summary).includes(lettersOnly(venue));
	}
</script>

<section id="shows" aria-label="Shows">
	<SectionHeading label="Shows" />

	<h2>Upcoming</h2>
	{#if upcoming.length === 0}
		<p class="state">No upcoming shows</p>
	{:else}
		<div class="timeline">
			<Vine seed={vineSeed} bind:grown={upcomingGrown} bind:duration={upcomingGrowFor} bind:skipped={upcomingSkipped} />
			<ul>
				{#each upcoming as show (show.uid)}
					<li id={show.anchor}>
						<div class="when">
							<span class="date date-full">{formatDate(show.start)}</span>
							<span class="date date-short">{formatDateShort(show.start)}</span>
							<span class="time">{timeFmt.format(show.start)}</span>
						</div>
						<div class="details">
							<span class="summary">{show.summary}</span>
							{#if show.venue && !venueInSummary(show.summary, show.venue)}
								<span class="venue">{show.venue}</span>
							{/if}
							{#if show.simpleAddress}
								<a
									class="address"
									href={mapLink(show.location ?? show.fullAddress ?? show.simpleAddress)}
									target="_blank"
									rel="noopener"
								><IconLocation />{show.simpleAddress}</a>
							{/if}
							{#if show.tickets || show.url || show.instagram}
								<div class="links">
									{#if show.tickets}
										<a class="tickets-link" href={show.tickets} target="_blank" rel="noopener">
											<IconTicket /> Tickets
										</a>
									{/if}
									{#if show.url}
										<a class="details-link" href={show.url} target="_blank" rel="noopener">
											<IconLaunch /> Event Details
										</a>
									{/if}
									{#if show.instagram}
										<a class="ig-link" href={show.instagram} target="_blank" rel="noopener" aria-label="Event flier on Instagram">
											<IconInstagram /> Event Flier
										</a>
									{/if}
								</div>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if past.length > 0}
		<h2>Past</h2>
		<div class="timeline past">
			<Vine
				seed={vineSeed + 1}
				roots
				grow={upcoming.length ? upcomingGrown : undefined}
				delay={upcoming.length && !upcomingSkipped ? upcomingGrowFor : 0}
			/>
			<ul>
				{#each visiblePast as show (show.uid)}
					<li id={show.anchor}>
						<div class="when">
							<span class="date date-full">{formatDate(show.start)}</span>
							<span class="date date-short">{formatDateShort(show.start)}</span>
							<span class="time">{timeFmt.format(show.start)}</span>
						</div>
						<div class="details">
							<span class="summary">{show.summary}</span>
							{#if show.venue && !venueInSummary(show.summary, show.venue)}
								<span class="venue">{show.venue}</span>
							{/if}
							{#if show.simpleAddress}
								<a
									class="address"
									href={mapLink(show.location ?? show.fullAddress ?? show.simpleAddress)}
									target="_blank"
									rel="noopener"
								><IconLocation />{show.simpleAddress}</a>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</div>
		<!-- Outside the faded list, so the bean keeps its full colour -->
		<div class="end-bean"><Bean which="a" size="3.25rem" /></div>
		{#if past.length > PAST_LIMIT}
			<button class="past-more" onclick={() => (pastExpanded = !pastExpanded)}>
				{#if pastExpanded}
					Show less
				{:else}
					and {past.length - PAST_LIMIT} more show{past.length - PAST_LIMIT === 1 ? '' : 's'}
				{/if}
			</button>
		{/if}
	{/if}
</section>

<style>
	section {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		margin-top: 1.5rem;
		width: 100%;
	}

	h2 {
		margin: 0.75rem 0 0.25rem;
		font-size: 0.95rem;
		letter-spacing: 0.16em;
		color: var(--color-text-faint);
	}

	.state {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 0.95rem;
	}

	.timeline {
		position: relative;
		width: 100%;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	li {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: start;
		text-align: left;
	}

	.when {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.15rem;
		padding-right: 2.5rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		white-space: nowrap;
	}

	.date {
		font-weight: 600;
		color: var(--color-text);
	}

	.date-short {
		display: none;
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
		padding-left: 2.5rem;
	}

	.summary {
		font-weight: 600;
	}

	.venue {
		color: var(--color-text-muted);
		font-size: 0.95rem;
	}

	.address {
		color: var(--color-text-subtle);
		font-size: 0.85rem;
	}

	a.address {
		align-self: flex-start;
		color: var(--gb-aqua);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	a.address :global(svg) {
		vertical-align: -0.25em;
		margin-right: 0.25rem;
	}

	a.address:hover {
		color: var(--color-link-hover);
	}

	.details > a:not(.address) {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.85rem;
		margin-top: 0.1rem;
	}

	.links {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.1rem;
	}

	.links a {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.85rem;
	}

	.links a.ig-link {
		color: var(--gb-purple);
	}

	.links a.ig-link:hover {
		color: var(--color-link-hover);
	}

	.past {
		opacity: 0.7;
	}

	/* Stands left of the "more shows" toggle at the foot of the list; no height of its own */
	.end-bean {
		position: relative;
		width: 100%;
		height: 0;
		margin-top: -0.75rem;
	}

	.end-bean :global(.bean) {
		position: absolute;
		right: calc(50% + 7.5rem);
		bottom: -4.5rem;
		rotate: -8deg;
	}

	/* Phones have no room left of the dates */
	@media (max-width: 768px) {
		.end-bean {
			display: none;
		}
	}

	.past .summary {
		font-weight: 500;
	}

	.past-more {
		margin: 0.25rem 0 0;
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.85rem;
		letter-spacing: 0.04em;
		color: var(--color-text-subtle);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.past-more:hover {
		color: var(--color-link-hover);
	}

	@media (max-width: 600px) {
		section {
			align-items: flex-start;
		}

		section > h2,
		section > .past-more {
			align-self: center;
		}

		li {
			grid-template-columns: 7rem 1fr;
		}

		.timeline {
			--vine-x: 7rem;
		}

		.date-full {
			display: none;
		}

		.date-short {
			display: inline;
		}

		.when {
			padding-right: 1.5rem;
			font-size: 0.85rem;
		}

		.details {
			padding-left: 1.75rem;
		}
	}
</style>
