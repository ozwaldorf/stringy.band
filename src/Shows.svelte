<script lang="ts">
	import IconLaunch from '~icons/carbon/launch';
	import IconLocation from '~icons/carbon/location';
	import IconInstagram from '~icons/carbon/logo-instagram';
	import data from './lib/shows.json';

	const all = data.shows.map((s) => ({
		...s,
		start: new Date(s.start),
		end: new Date(s.end)
	}));
	const now = Date.now();
	const upcoming = all.filter((s) => s.end.getTime() >= now);
	const past = all
		.filter((s) => s.end.getTime() < now)
		.reverse()
		.slice(0, 5);

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
									<a class="ig-link" href={show.instagram} target="_blank" rel="noopener" aria-label="Instagram post">
										<IconInstagram /> Instagram
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
			{#each past as show (show.uid)}
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
		<h3 class="past-more">...</h3>
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

	.upcoming-row {
		--stalk: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 80' fill='none' stroke='%2379740e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 0 C 14 10, 9 18, 12 28 C 15 38, 9 48, 12 58 C 15 68, 10 76, 12 80' /%3E%3Cg%3E%3Cpath d='M12 8 Q 15 10 17 12' stroke-width='1'/%3E%3Cpath d='M17 12 Q 23 14 22 22 Q 17 20 15 13 Z' fill='%2398971a' stroke='%2379740e' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M17 12 Q 20 16 22 22' stroke='%2379740e' stroke-width='0.7' opacity='0.7' fill='none'/%3E%3C/g%3E%3Cg%3E%3Cpath d='M12 32 Q 9 34 7 36' stroke-width='1'/%3E%3Cpath d='M7 36 Q 1 38 2 46 Q 7 44 9 37 Z' fill='%2398971a' stroke='%2379740e' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M7 36 Q 4 40 2 46' stroke='%2379740e' stroke-width='0.7' opacity='0.7' fill='none'/%3E%3C/g%3E%3Cg%3E%3Cpath d='M12 54 Q 15 56 17 58' stroke-width='1'/%3E%3Cpath d='M17 58 Q 23 60 22 68 Q 17 66 15 59 Z' fill='%2398971a' stroke='%2379740e' stroke-width='1' stroke-linejoin='round'/%3E%3Cpath d='M17 58 Q 20 62 22 68' stroke='%2379740e' stroke-width='0.7' opacity='0.7' fill='none'/%3E%3C/g%3E%3C/svg%3E");
	}

	.upcoming-row .details::before {
		content: '';
		position: absolute;
		left: -1rem;
		top: 0;
		bottom: -1rem;
		width: 2rem;
		background-image: var(--stalk);
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
		margin: 0;
		padding-left: 0.2em;
		font-size: 1.3rem;
		letter-spacing: 0.2em;
		line-height: 1;
		color: var(--color-border);
	}

	@media (max-width: 600px) {
		section {
			align-items: flex-start;
		}

		section > h1,
		section > h2,
		section > h3 {
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
