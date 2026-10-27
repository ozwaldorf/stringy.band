import { prefersReducedMotion } from 'svelte/motion';

const INTERRUPTS = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
const SWALLOWED = ['wheel', 'touchmove'] as const;
// Trackpad momentum keeps sending wheel events for a while after a flick
const SETTLE_MS = 200;

let cancel: (() => void) | undefined;
let release: (() => void) | undefined;

export const gliding = () => Boolean(cancel || release);

// Where the page scrolls to for an element (the top when it is missing)
export function glideTarget(id: string) {
	const target = id ? document.getElementById(id) : null;
	const margin = target ? parseFloat(getComputedStyle(target).scrollMarginTop) || 0 : 0;
	const limit = document.documentElement.scrollHeight - window.innerHeight;
	return Math.min(limit, Math.max(0, target ? target.getBoundingClientRect().top + window.scrollY - margin : 0));
}

// Eased scroll to an element (or the top when it is missing). Native smooth
// scrolling rushes short hops, so the duration has a floor; any input from the
// visitor stops it. A captive glide takes over a scroll in progress instead: it
// starts at `speed` (px/ms, the visitor's own) and swallows scrolling until it
// lands and the gesture settles. Announces `glidestart` (with the id) and
// `glideend` on window.
export function glideTo(id: string, captive = false, speed = 0) {
	cancel?.();
	release?.();
	window.dispatchEvent(new CustomEvent('glidestart', { detail: id }));
	// Scroll snapping is off while this is set
	document.documentElement.classList.add('gliding');
	const to = glideTarget(id);
	const from = window.scrollY;
	const distance = to - from;

	let settle = 0;
	let touchY: number | undefined;
	const onTouchStart = (event: TouchEvent) => {
		touchY = event.touches[0]?.clientY;
	};
	// Scrolling the glide's way is swallowed; the other way stops it and goes through
	const swallow = (event: Event) => {
		let push = 0;
		if (event instanceof WheelEvent) push = Math.sign(event.deltaY);
		else {
			const y = (event as TouchEvent).touches[0]?.clientY;
			if (touchY !== undefined && y !== undefined) push = Math.sign(touchY - y);
			touchY = y;
		}
		if (push && push !== Math.sign(distance)) {
			cancel?.();
			release?.();
			return;
		}
		event.preventDefault();
		if (cancel) return;
		clearTimeout(settle);
		settle = window.setTimeout(release!, SETTLE_MS);
	};
	if (captive) {
		for (const type of SWALLOWED) window.addEventListener(type, swallow, { passive: false });
		window.addEventListener('touchstart', onTouchStart, { passive: true });
		release = () => {
			clearTimeout(settle);
			for (const type of SWALLOWED) window.removeEventListener(type, swallow);
			window.removeEventListener('touchstart', onTouchStart);
			release = undefined;
		};
	}

	if (prefersReducedMotion.current || Math.abs(distance) < 2) {
		window.scrollTo({ top: to, behavior: 'instant' });
		document.documentElement.classList.remove('gliding');
		window.dispatchEvent(new Event('glideend'));
		if (release) settle = window.setTimeout(release, SETTLE_MS);
		return;
	}

	const duration = Math.min(1200, Math.max(750, Math.abs(distance) * 0.5));
	// Starting slope of the captive curve; above 3 it would overshoot
	const lead = Math.min(3, (speed * duration) / Math.abs(distance));
	const start = performance.now();
	let frame = 0;

	const interrupts = captive ? (['mousedown'] as const) : INTERRUPTS;
	const stop = () => {
		cancelAnimationFrame(frame);
		for (const type of interrupts) window.removeEventListener(type, stop);
		cancel = undefined;
		document.documentElement.classList.remove('gliding');
		if (release) settle = window.setTimeout(release, SETTLE_MS);
		window.dispatchEvent(new Event('glideend'));
	};

	const step = (now: number) => {
		const t = Math.min(1, (now - start) / duration);
		const eased = captive
			? lead * (t ** 3 - 2 * t ** 2 + t) + 3 * t ** 2 - 2 * t ** 3
			: t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
		window.scrollTo({ top: from + distance * eased, behavior: 'instant' });
		if (t < 1) frame = requestAnimationFrame(step);
		else stop();
	};

	for (const type of interrupts) window.addEventListener(type, stop, { passive: true });
	frame = requestAnimationFrame(step);
	cancel = stop;
}
