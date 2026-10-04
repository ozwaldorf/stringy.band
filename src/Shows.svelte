<script lang="ts">
	import IconLaunch from '~icons/carbon/launch';
	import IconLocation from '~icons/carbon/location';
	import IconInstagram from '~icons/carbon/logo-instagram';
	import data from './lib/shows.json';
	import type { Show } from './lib/ical';

	const all: Show[] = data.shows.map((s) => ({
		...s,
		start: new Date(s.start),
		end: new Date(s.end)
	}));
	const now = Date.now();
	const upcoming = all.filter((s) => s.end.getTime() >= now);
	const past = all.filter((s) => s.end.getTime() < now).reverse();

	const PAST_LIMIT = 5;
	let pastExpanded = $state(false);
	const visiblePast = $derived(pastExpanded ? past : past.slice(0, PAST_LIMIT));

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

	function isFlipped(uid: string): boolean {
		let h = 0;
		for (let i = 0; i < uid.length; i++) h = (h + uid.charCodeAt(i)) & 0xffff;
		return (h & 1) === 1;
	}
</script>

<section aria-label="Shows">
	<h1>Shows</h1>

	<h2>Upcoming</h2>
	{#if upcoming.length === 0}
		<p class="state">No upcoming shows</p>
	{:else}
		<ul>
			{#each upcoming as show (show.uid)}
				<li class="upcoming-row" class:flipped={isFlipped(show.uid)}>
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
						{#if show.url || show.instagram}
							<div class="links">
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
	{/if}

	{#if past.length > 0}
		<h2>Past</h2>
		<ul class="past">
			{#each visiblePast as show (show.uid)}
				<li>
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
						{#if show.cityState}
							<span class="city-state"><IconLocation />{show.cityState}</span>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
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
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
		padding-left: 2.5rem;
		border-left: 1px solid var(--color-border);
	}

	.upcoming-row .details {
		border-left: none;
	}

	.past .details {
		border-left-width: 2px;
	}


	.upcoming-row .details::before {
		content: '';
		position: absolute;
		left: -1rem;
		top: 0;
		bottom: -1rem;
		width: 2rem;
		background-image: var(--floral-vine);
		background-repeat: repeat-y;
		background-size: 100% auto;
		background-position: left top;
		pointer-events: none;
	}

	.upcoming-row:last-child .details::before {
		bottom: 0;
	}

	.upcoming-row.flipped .details::before {
		transform: scaleX(-1);
	}

.summary {
		font-weight: 600;
	}

	.venue {
		color: var(--color-text-muted);
		font-size: 0.95rem;
	}

	.address,
	.city-state {
		color: var(--color-text-subtle);
		font-size: 0.85rem;
	}

	a.address {
		align-self: flex-start;
		color: var(--gb-aqua);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	a.address :global(svg),
	.city-state :global(svg) {
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

		section > h1,
		section > h2,
		section > .past-more {
			align-self: center;
		}

		li {
			grid-template-columns: 7rem 1fr;
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
