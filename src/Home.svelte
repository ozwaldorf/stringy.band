<script lang="ts">
	import IconEmail from '~icons/carbon/email';
	import IconYoutube from '~icons/carbon/logo-youtube';
	import IconInstagram from '~icons/carbon/logo-instagram';
	import IconTiktok from '~icons/simple-icons/tiktok';
	import IconBandsintown from '~icons/simple-icons/bandsintown';
	import IconFacebook from '~icons/carbon/logo-facebook';
	import Shows from './Shows.svelte';
	import Videos from './Videos.svelte';
	import ShopPreview from './ShopPreview.svelte';
	import Footer from './Footer.svelte';

	const lineup = [
		['Guitar', 'Phoenix Stewart'],
		['Bass(es)', 'Ossian Mapes'],
		['Mandolin', 'Sydney Jorgensen'],
		['Fiddle', 'Lake Isachsen'],
		['Banjo', 'Clara Guilmette']
	];
</script>

<svelte:head><title>Stringy and the Beans - Links and Upcoming Events</title></svelte:head>

<main tabindex="-1">
	<div class="content">
	<img src="/logo.svg" alt="Stringy and the Beans" />

	<section class="about" aria-label="About">
		<p class="lead">Upstate NY bluegrass quintet</p>
		<dl class="lineup">
			{#each lineup as [instrument, name] (name)}
				<dt>{instrument}</dt>
				<dd>{name}</dd>
			{/each}
		</dl>
		<p>
			Since forming in March 2026, the band has played the GottaGetGon Folk Festival, S&amp;S Farm Brewery's
			"Brewgrass" Festival, and venues all around the Capital Region.
		</p>
		<p>
			Their influences include the Bluegrass Album Band, Tony Rice, Doc Watson, Rhonda Vincent, Ricky
			Skaggs and David Grisman. They're currently recording original songs, many already debuted live at shows.
		</p>
	</section>

	<section class="socials-section" aria-label="Follow us">
		<h1>Follow Us</h1>
		<nav class="socials">
			<a
				class="bandsintown"
				href="https://www.bandsintown.com/a/15672469"
				target="_blank"
				rel="noopener"
				aria-label="Bandsintown"
				title="Bandsintown"
			>
				<IconBandsintown />
			</a>
			<a
				class="instagram"
				href="https://www.instagram.com/stringyandthebeans"
				target="_blank"
				rel="noopener"
				aria-label="Instagram"
				title="Instagram"
			>
				<IconInstagram />
			</a>
			<a
				class="youtube"
				href="https://www.youtube.com/@stringyandthebeans"
				target="_blank"
				rel="noopener"
				aria-label="YouTube"
				title="YouTube"
			>
				<IconYoutube />
			</a>
			<a
				class="facebook"
				href="https://www.facebook.com/profile.php?id=61567240809186"
				target="_blank"
				rel="noopener"
				aria-label="Facebook"
				title="Facebook"
			>
				<IconFacebook />
			</a>
			<a
				class="tiktok"
				href="https://www.tiktok.com/@stringyandthebeans"
				target="_blank"
				rel="noopener"
				aria-label="TikTok"
				title="TikTok"
			>
				<IconTiktok />
			</a>
		</nav>
	</section>

	<Videos />
	<ShopPreview />

	<Shows />

	<section class="contact" aria-label="Booking contact">
		<h1>Contact Us</h1>
		<a href="mailto:beans@stringy.band"><IconEmail />beans@stringy.band</a>
	</section>
	</div>

	<Footer />
</main>

<style>
	main {
		min-height: 100dvh;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		padding: 1rem 2rem;
		text-align: center;
	}

	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
	}

	img {
		width: min(420px, 70vw);
		height: auto;
		margin-top: 2.5rem;
		transform: scale(1.1);
		transform-origin: center;
	}

	.about {
		/* One ruled line; all text and spacing snap to it */
		--line: 1.6rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--line);
		position: relative;
		box-sizing: border-box;
		width: min(34rem, 100%);
		margin-top: 1.5rem;
		/* Nudge text down so it sits just above each rule */
		padding: calc(var(--line) + 0.3rem) 2rem calc(var(--line) - 0.3rem);
		background-color: var(--gb-bg0-h);
		background-image: repeating-linear-gradient(
			transparent 0 calc(var(--line) - 1px),
			var(--gb-bg1) calc(var(--line) - 1px) var(--line)
		);
		border-radius: 2px;
		box-shadow:
			0 1px 2px rgba(60, 56, 54, 0.15),
			0 6px 16px rgba(60, 56, 54, 0.12);
		transform: rotate(-1deg);
	}

	/* Tape strip */
	.about::before {
		content: '';
		position: absolute;
		top: -0.7rem;
		left: 50%;
		width: 6.5rem;
		height: 1.4rem;
		background: rgba(215, 153, 33, 0.35);
		box-shadow: 0 1px 2px rgba(60, 56, 54, 0.12);
		transform: translateX(-50%) rotate(2deg);
	}

	.about p {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 1rem;
		line-height: var(--line);
		text-align: left;
	}

	.about .lead {
		color: var(--color-text);
		font-size: 1.1rem;
		text-align: center;
		text-wrap: balance;
	}

	.lineup {
		display: grid;
		grid-template-columns: auto auto;
		gap: 0 1rem;
		margin: 0;
	}

	.lineup dt {
		text-align: right;
		color: var(--color-text-subtle);
		font-size: 0.85rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		line-height: var(--line);
	}

	.lineup dd {
		margin: 0;
		text-align: left;
		color: var(--color-text);
		line-height: var(--line);
	}

	.contact {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		margin-top: 1rem;
	}

	.contact h1 {
		margin: 0;
		font-size: 1.25rem;
		letter-spacing: 0.14em;
		color: var(--color-text-subtle);
	}

	.contact a {
		font-size: 1.1rem;
		font-weight: 400;
	}

	.contact a :global(svg) {
		vertical-align: -0.3em;
		margin-right: 0.4rem;
	}

	.socials-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}

	.socials-section h1 {
		margin: 0;
		font-size: 1.25rem;
		letter-spacing: 0.14em;
		color: var(--color-text-subtle);
	}

	.socials {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
	}

	.socials a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		font-size: 2.5rem;
		line-height: 0;
		transition: color 120ms ease, transform 120ms ease;
	}

	.socials a.instagram {
		color: var(--gb-purple);
	}

	.socials a.facebook {
		color: var(--gb-blue);
	}

	.socials a.youtube {
		color: var(--gb-red);
	}

	.socials a.tiktok {
		color: var(--gb-aqua-dim);
	}

	.socials a.bandsintown {
		color: var(--gb-aqua);
	}

	.socials a:hover {
		transform: translateY(-2px);
	}

	.socials a.tiktok :global(svg),
	.socials a.bandsintown :global(svg) {
		transform: scale(0.75);
	}
</style>
