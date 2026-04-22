<script lang="ts">
	import IconYoutube from '~icons/carbon/logo-youtube';
	import IconInstagram from '~icons/carbon/logo-instagram';
	import IconTiktok from '~icons/simple-icons/tiktok';
	import IconFacebook from '~icons/carbon/logo-facebook';
	import Shows from './Shows.svelte';
</script>

<main>
	<img src="/logo.png" alt="Stringy and the Beans" />

	<section class="about" aria-label="About">
		<p>Upstate NY bluegrass quartet</p>
	</section>

	<section class="socials-section" aria-label="Socials">
		<h1>Follow us</h1>
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
		<h1>Bookings</h1>
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

	.about {
		max-width: 28rem;
	}

	.about p {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 1.05rem;
		line-height: 1.5;
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
