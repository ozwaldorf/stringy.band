<script lang="ts">
	import IconEmail from '~icons/carbon/email';
	import IconYoutube from '~icons/carbon/logo-youtube';
	import IconInstagram from '~icons/carbon/logo-instagram';
	import IconTiktok from '~icons/simple-icons/tiktok';
	import IconBandsintown from '~icons/simple-icons/bandsintown';
	import IconFacebook from '~icons/carbon/logo-facebook';
	import IconMenu from '~icons/carbon/menu';
	import IconClose from '~icons/carbon/close';
	import { fly, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
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

	const sections = [
		['follow', 'Links'],
		['about', 'About'],
		['videos', 'Videos'],
		['merch', 'Merch'],
		['shows', 'Shows'],
		['contact', 'Contact']
	];

	let sentinel = $state<HTMLElement>();
	let stuck = $state(false);

	// The menu sticks to the top once the marker just above it scrolls away
	$effect(() => {
		if (!sentinel) return;
		const observer = new IntersectionObserver(([entry]) => {
			stuck = !entry.isIntersecting && entry.boundingClientRect.top < 0;
		});
		observer.observe(sentinel);
		return () => observer.disconnect();
	});

	// Phones: the landing list scrolls away and a compact bar with a menu
	// button takes over once it is gone
	let menuGone = $state(false);
	let mobileOpen = $state(false);
	const motion = (duration: number) => (prefersReducedMotion.current ? 0 : duration);

	$effect(() => {
		if (!menu) return;
		// Take over as soon as the list starts leaving the top, so a jump that
		// leaves part of it on screen still gets the bar
		const observer = new IntersectionObserver(([entry]) => {
			menuGone = entry.intersectionRatio < 1 && entry.boundingClientRect.top < 0;
			if (!menuGone) mobileOpen = false;
		}, { threshold: [0, 1] });
		observer.observe(menu);
		return () => observer.disconnect();
	});

	$effect(() => {
		if (!mobileOpen) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') mobileOpen = false;
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	let logo = $state<HTMLImageElement>();
	let slot = $state<HTMLElement>();
	let menu = $state<HTMLElement>();
	let sheet = $state<HTMLElement>();
	let bar = $state<HTMLElement>();

	// Shrink the landing logo into a slot beside the section links as the page
	// scrolls; the slot opens in step, so both arrive when the menu docks
	$effect(() => {
		if (!logo || !sentinel || !slot || !menu || !sheet || !bar) return;
		const nav = menu;
		const paper = sheet;
		const header = bar;
		const el = logo;
		const marker = sentinel;
		const dockSlot = slot;
		const wide = window.matchMedia('(min-width: 769px)');
		let start = { left: 0, top: 0, width: 1, height: 1 };
		let dock = 1;
		let dockLeft = 0;
		let unit = 16;
		let frame = 0;

		const box = el.parentElement!;

		// The logo is pinned with position: fixed so the browser keeps it steady
		// while scrolling; script only moves it as the docking progresses
		const measure = () => {
			const rect = box.getBoundingClientRect();
			start = { left: rect.left, top: rect.top + window.scrollY, width: rect.width, height: rect.height };
			dock = Math.max(1, marker.getBoundingClientRect().top + window.scrollY);
			unit = parseFloat(getComputedStyle(document.documentElement).fontSize);
			// Open the slot fully for a moment to find where the logo lands
			setSlot(1);
			dockLeft = dockSlot.getBoundingClientRect().left;
			update();
		};

		// Open the slot to the docked logo width; its negative margin cancels the
		// menu gap while closed
		const setSlot = (p: number) => {
			const width = (2.5 * unit * start.width) / start.height;
			dockSlot.style.width = `${width * p}px`;
			dockSlot.style.marginRight = `${(-1.25 + 1.5 * p) * unit}px`;
		};

		const update = () => {
			frame = 0;
			if (!wide.matches || !start.height) {
				el.classList.remove('pinned');
				el.style.cssText = '';
				dockSlot.style.width = '';
				dockSlot.style.marginRight = '';
				nav.style.removeProperty('--dock');
				nav.style.removeProperty('--reach');
				// Phones: one sheet from the top of the screen down past the list; its
				// edge rises with the list and stops to become the bar
				paper.style.setProperty('--sheet', `${Math.max(header.offsetHeight, nav.getBoundingClientRect().bottom)}px`);
				return;
			}
			el.classList.add('pinned');
			el.style.left = `${start.left}px`;
			el.style.top = `${start.top}px`;
			const p = Math.min(1, Math.max(0, window.scrollY / dock));
			setSlot(p);
			nav.style.setProperty('--dock', String(p));
			// Stretch the header paper up to the top of the screen while docking
			nav.style.setProperty('--reach', `${Math.max(0, dock - window.scrollY)}px`);
			const height = 2.5 * unit;
			const x = (dockLeft - start.left) * p;
			// Docked logo sits 0.5rem down in the header plus the docked top padding
			const y = (unit - start.top) * p;
			// Shrink ahead of the move so the logo is header-sized before it meets the links
			const shrink = 1 - (1 - p) ** 3;
			const scale = 1 + (height / start.height - 1) * shrink;
			el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
		};

		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};

		measure();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', measure);
		// Images and fonts finishing can move the logo and the menu
		window.addEventListener('load', measure);
		el.addEventListener('load', measure);
		wide.addEventListener('change', measure);
		// Any layout shift above or around the menu moves the docking points
		const resized = new ResizeObserver(() => measure());
		resized.observe(document.body);
		return () => {
			resized.disconnect();
			cancelAnimationFrame(frame);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', measure);
			window.removeEventListener('load', measure);
			el.removeEventListener('load', measure);
			wide.removeEventListener('change', measure);
		};
	});
</script>

<svelte:head><title>Stringy and the Beans - Links and Upcoming Events</title></svelte:head>

<main id="top" tabindex="-1">
	<div class="content">
	<a class="logo-link" href="#top" aria-label="Stringy and the Beans, back to top">
		<img class="logo" src="/logo.svg" alt="Stringy and the Beans" bind:this={logo} />
	</a>

	<div class="menu-sentinel" bind:this={sentinel}></div>
	<span class="paper mobile-sheet" aria-hidden="true" bind:this={sheet}></span>
	<header class="mobile-bar" class:visible={menuGone} inert={!menuGone} bind:this={bar}>
		<a class="mobile-logo" href="#top" aria-label="Stringy and the Beans, back to top">
			<img src="/logo.svg" alt="" />
		</a>
		<button
			class="menu-toggle"
			type="button"
			aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
			aria-expanded={mobileOpen}
			aria-controls="mobile-sections"
			onclick={() => (mobileOpen = !mobileOpen)}
		>
			<span class="toggle-icon" class:open={mobileOpen}>
				{#if mobileOpen}<IconClose />{:else}<IconMenu />{/if}
			</span>
		</button>
		{#if mobileOpen}
			<nav
				id="mobile-sections"
				class="mobile-sections"
				aria-label="Sections"
				transition:slide={{ duration: motion(220), easing: cubicOut }}
			>
				<span class="paper" aria-hidden="true"></span>
				{#each sections as [id, label], i (id)}
					<a
						href={`#${id}`}
						onclick={() => (mobileOpen = false)}
						in:fly={{ y: -8, duration: motion(200), delay: motion(40 + i * 35), easing: cubicOut }}
					>{label}</a>
				{/each}
			</nav>
		{/if}
	</header>

	<nav class="menu" class:stuck class:gone={menuGone} aria-label="Sections" bind:this={menu}>
		<span class="paper" aria-hidden="true"></span>
		<span class="logo-slot" aria-hidden="true" bind:this={slot}></span>
		{#each sections as [id, label] (id)}
			<a href={`#${id}`}>{label}</a>
		{/each}
	</nav>

	<section id="follow" class="socials-section" aria-label="Follow us">
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

	<section id="about" class="about" aria-label="About">
		<p class="lead">Upstate NY bluegrass quintet</p>
		<dl class="lineup">
			{#each lineup as [instrument, name] (name)}
				<dt>{instrument}</dt>
				<dd>{name}</dd>
			{/each}
		</dl>
		<p>
			Since forming in March 2026, the band has played the Green Mountain Bluegrass &amp; Roots Festival, the
			GottaGetGon Folk Festival, S&amp;S Farm Brewery's "Brewgrass" Festival, and venues all around the
			Capital Region.
		</p>
		<p>
			Their influences include the Bluegrass Album Band, Tony Rice, Doc Watson, Rhonda Vincent, Ricky
			Skaggs, David Grisman, and many more. They're currently recording original songs, many already debuted live at shows.
		</p>
	</section>

	<Videos />
	<ShopPreview />

	<Shows />

	<section id="contact" class="contact" aria-label="Booking contact">
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
		/* Logo and menu fill the first screen: split what's left of the viewport
		   (after the logo, the 1.5rem gap and the 3.5rem menu) above and below */
		--logo-width: min(462px, 77vw);
		--menu-height: 3.5rem;
		--landing-space: calc((100svh - var(--logo-width) * 0.7 - 1.5rem - var(--menu-height)) / 2);
		/* Top padding that balances the torn edge's average depth */
		--header-lift: 0.5rem;
	}

	/* Room between the page sections (Follow Us sits under the menu instead) */
	.content > :global(section:not(.socials-section)) {
		margin-top: 3rem;
	}

	.logo-link {
		display: flex;
		width: var(--logo-width);
		aspect-ratio: 10 / 7;
		/* main already has 1rem of top padding */
		margin-top: max(2rem, calc(var(--landing-space) - 1rem));
	}

	.logo {
		width: 100%;
		height: auto;
		transform-origin: 0 0;
	}

	.logo:global(.pinned) {
		position: fixed;
		z-index: 11;
		width: var(--logo-width);
		will-change: transform;
	}

	.menu-sentinel {
		height: 0;
		margin-bottom: -1.5rem;
	}

	/* The landing menu doubles as the header: it sticks to the top and keeps the
	   same layout and type either way; docking only adds a background */
	.menu {
		position: sticky;
		top: 0;
		z-index: 10;
		align-self: stretch;
		margin: 0 -2rem max(1.5rem, var(--landing-space));
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.25rem 1.25rem;
		min-height: 3.5rem;
		/* Grows to match the torn edge below as the header docks */
		padding: calc(var(--header-lift) * var(--dock, 0)) 1rem 0;
	}

	/* Before docking the sheet covers the whole screen; its torn edge rises
	   from the bottom to the header as the page scrolls */
	.menu .paper {
		height: calc(
			100% + var(--reach, 0px) + var(--tear) +
				max(0px, 100vh - var(--reach, 0px) - 100%) * (1 - var(--dock, 0))
		);
		/* Pin the mottle to the screen so it holds still while the sheet resizes */
		--mottle-size: 100% 100vh;
	}





	/* Room for the docked logo, opened in step with the scroll; the negative
	   margin cancels the gap while it is closed */
	.logo-slot {
		flex-shrink: 0;
		width: 0;
		margin-right: -1.25rem;
	}

	.menu a {
		color: var(--color-text-subtle);
		font-weight: 700;
		font-size: 0.9rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-decoration: none;
		transition: color 120ms ease;
	}

	.menu a:hover {
		color: var(--color-link-hover);
	}

	.mobile-sheet,
	.mobile-bar {
		display: none;
	}

	@media (max-width: 768px) {
		.content {
			/* No full-screen landing on phones; fixed spacing instead */
			--landing-space: 2.5rem;
		}

		/* The landing links sit in two columns and scroll away; the bar below
		   replaces them */
		.menu {
			position: relative;
			display: grid;
			grid-template-columns: repeat(2, auto);
			justify-content: center;
			justify-items: center;
			gap: 1rem 2.5rem;
			padding: 1rem 0 2rem;
		}

		.menu a {
			font-size: 1.5rem;
			letter-spacing: 0.12em;
			transition: color 120ms ease, opacity 200ms ease, visibility 200ms;
		}

		/* Fade the list out as the bar takes over */
		.menu.gone a {
			opacity: 0;
			visibility: hidden;
		}

		/* An odd last link centers across both columns */
		.menu a:last-of-type:nth-of-type(odd) {
			grid-column: 1 / -1;
		}

		.menu .paper {
			display: none;
		}

		/* One sheet behind the landing list and the bar: it sits under the logo
		   and links, and its edge stops at the bar once they scroll away */
		.mobile-sheet {
			display: block;
			position: fixed;
			top: 0;
			z-index: 9;
			height: calc(var(--sheet, 3.5rem) + var(--tear));
			--mottle-size: 100% 100vh;
		}

		/* Keep the logo above the sheet */
		.logo-link {
			position: relative;
			z-index: 11;
		}

		.logo-slot {
			display: none;
		}

		.mobile-bar {
			position: fixed;
			inset: 0 0 auto;
			z-index: 12;
			display: flex;
			align-items: center;
			justify-content: space-between;
			height: 3.5rem;
			padding: var(--header-lift) 1rem 0;
			/* The sheet stays put; only the bar's logo and button fade in */
			opacity: 0;
			visibility: hidden;
			transition: opacity 200ms ease, visibility 200ms;
		}

		.mobile-bar.visible {
			opacity: 1;
			visibility: visible;
		}

		.mobile-logo {
			display: flex;
		}

		.mobile-logo img {
			height: 2.5rem;
			width: auto;
		}

		.menu-toggle {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 2.75rem;
			height: 2.75rem;
			padding: 0;
			border: none;
			background: none;
			color: var(--color-text-subtle);
			font-size: 1.6rem;
			cursor: pointer;
		}

		.toggle-icon {
			display: inline-flex;
			transition: transform 220ms ease;
		}

		.toggle-icon.open {
			transform: rotate(90deg);
		}

		.mobile-sections {
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.25rem;
			padding: 0.75rem 0 1rem;
		}

		.mobile-sections a {
			padding: 0.5rem 1rem;
			color: var(--color-text-subtle);
			font-weight: 700;
			font-size: 1.5rem;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			text-decoration: none;
		}

		.mobile-sections a:hover {
			color: var(--color-link-hover);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.menu,
		.menu a,
		.mobile-bar,
		.toggle-icon {
			transition: none;
		}
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
		margin-bottom: 3rem;
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
