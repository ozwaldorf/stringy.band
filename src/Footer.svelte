<footer>
	<span class="paper up" aria-hidden="true"></span>
	<small>&copy; {new Date().getFullYear()} Stringy and the Beans</small>
</footer>

<style>
	footer {
		position: relative;
		z-index: 0;
		/* Reach the bottom of the page through the container's bottom padding */
		margin: 2.5rem 0 calc(-1 * var(--footer-bleed, 1rem));
		padding: 0.75rem 0 calc(0.5rem + var(--footer-bleed, 1rem));
		color: var(--color-text-subtle);
		font-size: 0.8rem;
		text-align: center;
	}

	/* Run the sheet edge to edge of the screen */
	.paper {
		left: calc(50% - 50vw);
		right: calc(50% - 50vw);
	}
</style>
