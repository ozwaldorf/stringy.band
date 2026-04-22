<script lang="ts">
	import IconYoutube from '~icons/carbon/logo-youtube';
	import IconInstagram from '~icons/carbon/logo-instagram';
	import IconTiktok from '~icons/simple-icons/tiktok';
	import IconFacebook from '~icons/carbon/logo-facebook';
	import Shows from './Shows.svelte';
</script>

<main>
	<h1>Coming soon</h1>
	<img src="/logo.png" alt="Stringy and the Beans" />

	<section class="socials-section" aria-label="Socials">
		<h2>Follow us</h2>
		<nav class="socials">
			<a
				href="https://www.instagram.com/stringyandthebeans"
				target="_blank"
				rel="noopener"
				aria-label="Instagram"
			>
				<IconInstagram />
			</a>
			<a
				href="https://www.facebook.com/profile.php?id=61567240809186"
				target="_blank"
				rel="noopener"
				aria-label="Facebook"
			>
				<IconFacebook />
			</a>
			<a
				href="https://www.youtube.com/@stringyandthebeans"
				target="_blank"
				rel="noopener"
				aria-label="YouTube"
			>
				<IconYoutube />
			</a>
			<a
				class="tiktok"
				href="https://www.tiktok.com/@stringyandthebeans"
				target="_blank"
				rel="noopener"
				aria-label="TikTok"
			>
				<IconTiktok />
			</a>
		</nav>
	</section>

	<Shows />

	<section class="contact" aria-label="Booking contact">
		<h2>Bookings</h2>
		<a href="mailto:beans@stringy.band">beans@stringy.band</a>
	</section>
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		padding: 2rem;
		text-align: center;
	}

	img {
		width: min(420px, 70vw);
		height: auto;
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
	}

	.contact {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		margin-top: 1rem;
	}

	.contact h2 {
		margin: 0;
		font-size: 0.8rem;
		letter-spacing: 0.14em;
		color: var(--color-text-subtle);
	}

	.contact a {
		font-size: 1.1rem;
		font-weight: 400;
	}

	.socials-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}

	.socials-section h2 {
		margin: 0;
		font-size: 0.8rem;
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
		width: 2rem;
		height: 2rem;
		color: var(--color-text-muted);
		font-size: 2rem;
		line-height: 0;
		transition: color 120ms ease;
	}

	.socials a:hover {
		color: var(--color-link-hover);
	}

	.socials a.tiktok :global(svg) {
		transform: scale(0.75);
	}
</style>
