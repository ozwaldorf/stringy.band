<script lang="ts">
	import IconLaunch from '~icons/carbon/launch';
	import IconLocation from '~icons/carbon/location';
	import data from './lib/shows.json';

	const all = data.shows.map((s) => ({
		...s,
		start: new Date(s.start),
		end: new Date(s.end)
	}));
	const now = Date.now();
	const upcoming = all.filter((s) => s.end.getTime() >= now);
	const past = all.filter((s) => s.end.getTime() < now).reverse();

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

	function mapLink(location: string): string {
		return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
	}

	function cityState(address?: string): string | undefined {
		if (!address) return;
		const parts = address.split(',').map((s) => s.trim());
		if (parts.length < 3) return;
		const middle = parts.slice(1, -1).join(', ');
		return middle.replace(/\s+\d{5}(?:-\d{4})?$/, '');
	}

	function lettersOnly(s: string): string {
		return s.toLowerCase().replace(/[^a-z]/g, '');
	}

	function venueInSummary(summary: string, venue?: string): boolean {
		if (!venue) return false;
		return lettersOnly(summary).includes(lettersOnly(venue));
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
				<li>
					<div class="when">
						<span class="date">{formatDate(show.start)}</span>
						<span class="time">{timeFmt.format(show.start)}</span>
					</div>
					<div class="details">
						<span class="summary">{show.summary}</span>
						{#if show.venue && !venueInSummary(show.summary, show.venue)}
							<span class="venue">{show.venue}</span>
						{/if}
						{#if show.address}
							<a
								class="address"
								href={mapLink(show.location ?? show.address)}
								target="_blank"
								rel="noopener"
							><IconLocation />{show.address}</a>
						{/if}
						{#if show.url}
							<a class="details-link" href={show.url} target="_blank" rel="noopener">
								<IconLaunch /> Event Details
							</a>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	{#if past.length > 0}
		<h2>Past</h2>
		<ul class="past">
			{#each past as show (show.uid)}
				<li>
					<div class="when">
						<span class="date">{formatDate(show.start)}</span>
						<span class="time">{timeFmt.format(show.start)}</span>
					</div>
					<div class="details">
						<span class="summary">{show.summary}</span>
						{#if show.venue && !venueInSummary(show.summary, show.venue)}
							<span class="venue">{show.venue}</span>
						{/if}
						{#if cityState(show.address)}
							<span class="city-state"><IconLocation />{cityState(show.address)}</span>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
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
		padding-right: 1rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		white-space: nowrap;
	}

	.date {
		font-weight: 600;
		color: var(--color-text);
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
		padding-left: 1rem;
		border-left: 1px solid var(--color-border);
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

	.past {
		opacity: 0.7;
	}

	.past .summary {
		font-weight: 500;
	}

	@media (max-width: 32rem) {
		li {
			grid-template-columns: 1fr;
			row-gap: 0.35rem;
		}

		.when {
			align-items: flex-start;
		}

		.details {
			padding-left: 0;
			border-left: none;
		}
	}
</style>
