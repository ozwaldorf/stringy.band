<script lang="ts">
	import IconEmail from '~icons/carbon/email';
	import IconYoutube from '~icons/carbon/logo-youtube';
	import IconInstagram from '~icons/carbon/logo-instagram';
	import IconTiktok from '~icons/simple-icons/tiktok';
	import IconBandsintown from '~icons/simple-icons/bandsintown';
	import IconFacebook from '~icons/carbon/logo-facebook';
	import IconMenu from '~icons/carbon/menu';
	import IconClose from '~icons/carbon/close';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import Shows from './Shows.svelte';
	import Videos from './Videos.svelte';
	import videoData from './lib/videos.json';
	import ShopPreview from './ShopPreview.svelte';
	import BandPhotos from './BandPhotos.svelte';
	import Logo from './Logo.svelte';
	import SectionHeading from './SectionHeading.svelte';
	import Bean from './Bean.svelte';
	import Footer from './Footer.svelte';
	import { glideTarget, glideTo, gliding } from './lib/scroll';

	const lineup = [
		['Guitar', 'Phoenix Stewart'],
		['Bass(es)', 'Ossian Mapes'],
		['Mandolin', 'Sydney Jorgensen'],
		['Fiddle', 'Lake Isachsen'],
		['Banjo', 'Clara Guilmette']
	];

	const sections = [
		['follow', 'Socials'],
		['about', 'About'],
		// The videos section is left out when the feed came back empty
		...(videoData.videos.length ? [['videos', 'Videos']] : []),
		['merch', 'Merch'],
		['shows', 'Shows'],
		['contact', 'Contact']
	];

	// The section in view: one that fills the whole screen below the header wins,
	// otherwise the one with the largest share of itself visible. A link glide
	// shows its destination instead, and the URL hash follows along.
	let active = $state('');

	$effect(() => {
		let frame = 0;
		let gliding = false;
		let current = '';
		const update = (sync = true) => {
			frame = 0;
			if (gliding) return;
			const top = 4 * parseFloat(getComputedStyle(document.documentElement).fontSize);
			const room = window.innerHeight - top;
			let best = '';
			let bestScore = 0;
			for (const [id] of sections) {
				const rect = document.getElementById(id)?.getBoundingClientRect();
				if (!rect || !rect.height) continue;
				const seen = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, top);
				if (seen <= 0) continue;
				// Ties keep the current pick, so a glide's destination stays lit
				const score = (seen >= room - 1 ? 1 : 0) + seen / rect.height + (id === current ? 0.001 : 0);
				if (score > bestScore) [best, bestScore] = [id, score];
			}
			active = current = best;
			const hash = best ? `#${best}` : '';
			if (sync && window.location.hash !== hash) {
				window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`);
			}
		};
		const schedule = () => { if (!frame) frame = requestAnimationFrame(() => update()); };
		const onGlideStart = (event: Event) => {
			gliding = true;
			active = current = (event as CustomEvent<string>).detail;
		};
		const onGlideEnd = () => {
			gliding = false;
			update();
		};
		// Leave an incoming hash alone until the visitor scrolls
		update(false);
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);
		window.addEventListener('glidestart', onGlideStart);
		window.addEventListener('glideend', onGlideEnd);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			window.removeEventListener('glidestart', onGlideStart);
			window.removeEventListener('glideend', onGlideEnd);
		};
	});

	// Scrolling up past the links carries on to the top. Snapping would hold it
	// at the links, so it is off below them, and at the crossing a glide takes
	// over at the visitor's own speed
	$effect(() => {
		const root = document.documentElement;
		let lastY = window.scrollY;
		let lastAt = performance.now();
		const onScroll = (event: Event) => {
			const y = window.scrollY;
			const links = glideTarget('follow');
			if (!gliding() && y < lastY && lastY > links && y < links - 1 && y > 0) {
				glideTo('', true, (lastY - y) / Math.max(8, event.timeStamp - lastAt));
			}
			root.classList.toggle('below-links', y > links + 1);
			lastY = y;
			lastAt = event.timeStamp;
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', onScroll);
			root.classList.remove('below-links');
		};
	});

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
	// Height of the phone menu; the landing sheet slides down by what hangs below the bar
	let dropHeight = $state(0);
	const motion = (duration: number) => (prefersReducedMotion.current ? 0 : duration);

	// Moves the phone menu down from behind the bar, in step with the sheet
	const drop = (node: HTMLElement) => ({
		duration: motion(220),
		easing: cubicOut,
		css: (t: number) => `transform: translateY(${(t - 1) * node.offsetHeight}px)`
	});

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

	let logo = $state<HTMLElement>();
	let slot = $state<HTMLElement>();
	let menu = $state<HTMLElement>();
	let sheet = $state<HTMLElement>();

	// Shrink the landing logo into a slot beside the section links as the page
	// scrolls; the slot opens in step, and both arrive as the landing sheet sticks
	$effect(() => {
		if (!logo || !sentinel || !slot || !menu || !sheet) return;
		const nav = menu;
		const paper = sheet;
		const el = logo;
		const marker = sentinel;
		const dockSlot = slot;
		const wide = window.matchMedia('(min-width: 769px)');
		let start = { left: 0, top: 0, width: 1, height: 1 };
		let dock = 1;
		// Scroll distance until the landing sheet sticks as the header
		let stick = 1;
		let dockLeft = 0;
		let unit = 16;
		let frame = 0;
		// Scroll position last drawn, clamped to where docking ends
		let drawn = -1;

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
			// The sheet runs from the top of the page to the end of the landing (the
			// first screen on desktop, the link list on phones) and sticks as the header
			const lead = paper.parentElement!.getBoundingClientRect().top + window.scrollY;
			const end = wide.matches ? Math.max(window.innerHeight, dock + 3.5 * unit) : nav.getBoundingClientRect().bottom + window.scrollY;
			paper.style.setProperty('--sheet-lead', `${lead}px`);
			paper.style.setProperty('--sheet-h', `${end}px`);
			// The header is 3.5rem plus 0.5rem of top padding once docked
			stick = Math.max(1, end - 4 * unit);
			drawn = -1;
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
			// Read before any writes so the frame does not force a layout
			const scrolled = window.scrollY;
			if (!wide.matches || !start.height) {
				if (drawn === -2) return;
				drawn = -2;
				el.classList.remove('pinned');
				el.style.cssText = '';
				dockSlot.style.width = '';
				dockSlot.style.marginRight = '';
				nav.style.removeProperty('--dock');
				nav.style.transform = '';
				return;
			}
			// Past the dock nothing moves
			const at = Math.min(scrolled, Math.max(dock, stick));
			if (at === drawn) return;
			drawn = at;
			el.classList.add('pinned');
			el.style.left = `${start.left}px`;
			el.style.top = `${start.top}px`;
			const p = Math.min(1, Math.max(0, scrolled / stick));
			setSlot(p);
			nav.style.setProperty('--dock', String(p));
			// Sticky alone would pin the links as soon as they reach the top; hold them
			// back so they travel in step with the logo and the sheet
			nav.style.transform = `translateY(${dock * (1 - p) - Math.max(0, dock - scrolled)}px)`;
			const height = 2.5 * unit;
			const x = (dockLeft - start.left) * p;
			// Docked logo sits 0.5rem down in the header plus the docked top padding
			const y = (unit - start.top) * p;
			// Shrink ahead of the move so the logo is header-sized before it meets the links
			const shrink = 1 - (1 - p) ** 3;
			const scale = 1 + (height / start.height - 1) * shrink;
			// A page transition morphs the logo by its box (App.svelte), and a scaled box would
			// balloon midway; meanwhile size it for real, which draws the same
			const morphing = document.documentElement.classList.contains('swapping');
			el.style.width = morphing ? `${start.width * scale}px` : '';
			el.style.transform = morphing ? `translate(${x}px, ${y}px)` : `translate(${x}px, ${y}px) scale(${scale})`;
		};

		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};

		measure();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', measure);
		// Images and fonts finishing can move the logo and the menu
		window.addEventListener('load', measure);
		wide.addEventListener('change', measure);
		// Redraw as a page transition starts and ends, to swap the logo's sizing
		const redraw = () => {
			drawn = -1;
			update();
		};
		window.addEventListener('route-morph', redraw);
		// Any layout shift above or around the menu moves the docking points
		const resized = new ResizeObserver(() => measure());
		resized.observe(document.body);
		return () => {
			resized.disconnect();
			cancelAnimationFrame(frame);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', measure);
			window.removeEventListener('load', measure);
			wide.removeEventListener('change', measure);
			window.removeEventListener('route-morph', redraw);
		};
	});
</script>

<svelte:head><title>Stringy and the Beans - Links and Upcoming Events</title></svelte:head>

<main id="top" tabindex="-1">
	<div class="content">
	<span class="paper landing-sheet" aria-hidden="true" style:--open-extra={mobileOpen ? `calc(${dropHeight}px - 3.5rem)` : '0px'} bind:this={sheet}></span>
	<a class="logo-link" href="#top" aria-label="Stringy and the Beans, back to top">
		<Logo class="logo" bind:element={logo} />
	</a>

	<div class="menu-sentinel" bind:this={sentinel}></div>
	<header class="mobile-bar" class:visible={menuGone} inert={!menuGone}>
		<a class="mobile-logo" href="#top" aria-label="Stringy and the Beans, back to top">
			<Logo />
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
			<!-- Clips the menu at the bar so it slides out from behind it -->
			<div class="mobile-sections-clip" bind:offsetHeight={dropHeight}>
				<nav id="mobile-sections" class="mobile-sections" aria-label="Sections" transition:drop>
					{#each sections as [id, label] (id)}
						<a
							href={`#${id}`}
							aria-current={active === id ? 'location' : undefined}
							onclick={() => (mobileOpen = false)}
						>{label}</a>
					{/each}
				</nav>
			</div>
		{/if}
	</header>

	<nav class="menu" class:stuck class:gone={menuGone} aria-label="Sections" bind:this={menu}>
		<span class="logo-slot" aria-hidden="true" bind:this={slot}></span>
		{#each sections as [id, label] (id)}
			<a href={`#${id}`} aria-current={active === id ? 'location' : undefined}>{label}</a>
		{/each}
	</nav>

	<section id="follow" class="socials-section" aria-label="Follow us">
		<SectionHeading label="Follow Us" />
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
		<div class="about-note note">
			<p class="lead">Upstate NY bluegrass quintet</p>
			<div class="players">
				<dl class="lineup">
					{#each lineup as [instrument, name] (name)}
						<dt>{instrument}</dt>
						<dd>{name}</dd>
					{/each}
				</dl>
				<Bean which="b" size="11.7cqi" class="beside" />
			</div>
			<p>
				Since forming in March 2026, the band has played at the Green Mountain Bluegrass &amp; Roots Festival, the
				GottaGetGon Folk Festival, S&amp;S Farm Brewery's "Brewgrass" Festival, and venues all around the
				Capital Region.
			</p>
			<p>
				Their influences include the Bluegrass Album Band, Tony Rice, Doc Watson, Rhonda Vincent, Ricky
				Skaggs, David Grisman, and many more. They're currently recording original songs, many already debuted live at shows.
			</p>
		</div>
		<BandPhotos />
	</section>

	<Videos />
	<ShopPreview />

	<Shows />

	<section id="contact" class="contact" aria-label="Booking contact">
		<SectionHeading label="Contact Us" />
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

	/* The landing snaps whole: a scroll on it settles at the top or on the links.
	   The links' snap area runs on to the end of the page, so everything below
	   scrolls freely. */
	/* Off while a link glides, or it would pull each step to a snap point, and
	   below the links, or it would stop a scroll back up at them */
	:global(html:has(#follow):not(.gliding, .below-links)) {
		scroll-snap-type: y mandatory;
	}

	.logo-link {
		scroll-snap-align: start;
		/* Pulls its snap point above the page, which clamps to the top */
		scroll-margin-top: 100vh;
		display: flex;
		width: var(--logo-width);
		aspect-ratio: 10 / 7;
		/* main already has 1rem of top padding */
		margin-top: max(2rem, calc(var(--landing-space) - 1rem));
	}

	.logo-link :global(.logo) {
		width: 100%;
		transform-origin: 0 0;
	}

	/* Slides to and from the shop header logo across a route change (App.svelte); one logo
	   per screen size carries the name, since two on one page would cancel the transition */
	@media (min-width: 769px) {
		.logo-link :global(.logo) {
			view-transition-name: site-logo;
		}
	}

	@media (max-width: 768px) {
		.mobile-logo :global(.logo-art) {
			view-transition-name: site-logo;
		}
	}

	.logo-link :global(.logo.pinned) {
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
		/* The bottom margin gives back what the top padding grows by, so docking
		   never shifts the page under a scroll in progress */
		margin: 0 -2rem calc(max(1.5rem, var(--landing-space)) - var(--header-lift) * var(--dock, 0));
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.25rem 1.25rem;
		min-height: 3.5rem;
		/* Grows to match the torn edge below as the header docks */
		padding: calc(var(--header-lift) * var(--dock, 0)) 1rem 0;
	}

	/* One sheet behind the landing and the header. It scrolls away with the
	   page, texture and all, and sticks once its torn edge reaches the bottom of
	   the header. It takes no room in the layout: the margins cancel its height
	   and pull it up and out to the edges of the page. */
	.landing-sheet {
		position: sticky;
		z-index: 9;
		left: auto;
		right: auto;
		top: calc(3.5rem + var(--header-lift) - var(--sheet-h, 100vh));
		align-self: stretch;
		height: calc(var(--sheet-h, 100vh) + var(--tear));
		margin: calc(-1 * var(--sheet-lead, 1rem)) calc(50% - 50vw)
			calc(var(--sheet-lead, 1rem) - var(--sheet-h, 100vh) - var(--tear) - 1.5rem);
		/* The open phone menu pulls the whole sheet down by its height */
		transform: translateY(var(--open-extra, 0px));
		transition: transform 220ms cubic-bezier(0.33, 1, 0.68, 1);
		/* Its own layer: otherwise Firefox repaints the masked, shadowed sheet on
		   every scrolled frame */
		will-change: transform;
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

	.menu a:hover,
	.menu a[aria-current] {
		color: var(--color-link-hover);
	}

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
			font-size: 1.2rem;
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

		/* Above the menu list, which tucks up into the bar row */
		.mobile-logo,
		.menu-toggle {
			position: relative;
			z-index: 1;
		}

		.mobile-logo {
			display: flex;
		}

		/* 2.5rem tall at the logo's 10:7 */
		.mobile-logo :global(.logo-art) {
			width: calc(2.5rem * 10 / 7);
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

		.mobile-sections-clip {
			position: absolute;
			/* The first row sits in the bar, between the logo and the close button */
			top: var(--header-lift);
			left: 0;
			right: 0;
			overflow: hidden;
		}

		/* Two columns, like the landing list */
		.mobile-sections {
			display: grid;
			grid-template-columns: repeat(2, auto);
			justify-content: center;
			justify-items: center;
			gap: 0.25rem clamp(1.5rem, 8vw, 2.5rem);
			padding: 1rem 0;
		}

		.mobile-sections a {
			padding: 0.5rem 0;
			color: var(--color-text-subtle);
			font-weight: 700;
			font-size: 1.2rem;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			text-decoration: none;
		}

		.mobile-sections a:last-of-type:nth-of-type(odd) {
			grid-column: 1 / -1;
		}

		.mobile-sections a:hover,
		.mobile-sections a[aria-current] {
			color: var(--color-link-hover);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.landing-sheet,
		.menu,
		.menu a,
		.mobile-bar,
		.toggle-icon {
			transition: none;
		}
	}

	.about {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 3rem 4rem;
		width: 100%;
		margin-top: 1.5rem;
	}

	.about-note {
		/* One ruled line; all text and spacing snap to it */
		--line: 1.6rem;
		/* The bean beside the lineup sizes itself as a share of the note */
		container-type: inline-size;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--line);
		box-sizing: border-box;
		width: min(34rem, 100%);
		/* Nudge text down so it sits just above each rule */
		padding: calc(var(--line) + 0.3rem) 2rem calc(var(--line) - 0.3rem);
		background-image: repeating-linear-gradient(
			transparent 0 calc(var(--line) - 1px),
			var(--gb-bg1) calc(var(--line) - 1px) var(--line)
		);
		transform: rotate(-1deg);
	}

	/* Stands beside the lineup, off to its right; the pair shifts left to stay balanced */
	.players {
		position: relative;
		translate: -1.5rem 0;
	}

	.players :global(.beside) {
		position: absolute;
		left: calc(100% + 5cqi);
		top: 50%;
		transform: translateY(calc(-50% + 1.25rem)) rotate(8deg);
	}

	.about-note p {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 1rem;
		line-height: var(--line);
		text-align: left;
	}

	.about-note .lead {
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

	.contact a {
		font-size: 1.1rem;
		font-weight: 400;
	}

	.contact a :global(svg) {
		vertical-align: -0.3em;
		margin-right: 0.4rem;
	}

	.socials-section {
		scroll-snap-align: start;
		scroll-margin-bottom: 100000px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}

	/* Clear the landing sheet's torn edge on desktop */
	@media (min-width: 769px) {
		.socials-section {
			margin-top: 3.5rem;
			/* More room under the header when the page settles on the links */
			scroll-margin-top: 9.5rem;
		}
	}

	.socials {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1.25rem;
	}

	.socials a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3.25rem;
		height: 3.25rem;
		font-size: 3.25rem;
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

	/* A little smaller on phones, so all five fit on one row */
	@media (max-width: 768px) {
		.socials {
			gap: 1rem;
		}

		.socials a {
			width: 2.75rem;
			height: 2.75rem;
			font-size: 2.75rem;
		}
	}
</style>
