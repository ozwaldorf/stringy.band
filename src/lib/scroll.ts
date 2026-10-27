import { prefersReducedMotion } from 'svelte/motion';

const INTERRUPTS = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;

let cancel: (() => void) | undefined;

// Eased scroll to an element (or the top when it is missing). Native smooth
// scrolling rushes short hops, so the duration has a floor; any input from the
// visitor stops it. Announces `glidestart` (with the id) and `glideend` on window.
export function glideTo(id: string) {
	cancel?.();
	window.dispatchEvent(new CustomEvent('glidestart', { detail: id }));
	const target = id ? document.getElementById(id) : null;
	const margin = target ? parseFloat(getComputedStyle(target).scrollMarginTop) || 0 : 0;
	const limit = document.documentElement.scrollHeight - window.innerHeight;
	const to = Math.min(limit, Math.max(0, target ? target.getBoundingClientRect().top + window.scrollY - margin : 0));
	const from = window.scrollY;
	const distance = to - from;

	if (prefersReducedMotion.current || Math.abs(distance) < 2) {
		window.scrollTo({ top: to, behavior: 'instant' });
		window.dispatchEvent(new Event('glideend'));
		return;
	}

	const duration = Math.min(1200, Math.max(750, Math.abs(distance) * 0.5));
	const start = performance.now();
	let frame = 0;

	const stop = () => {
		cancelAnimationFrame(frame);
		for (const type of INTERRUPTS) window.removeEventListener(type, stop);
		cancel = undefined;
		window.dispatchEvent(new Event('glideend'));
	};

	const step = (now: number) => {
		const t = Math.min(1, (now - start) / duration);
		const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
		window.scrollTo({ top: from + distance * eased, behavior: 'instant' });
		if (t < 1) frame = requestAnimationFrame(step);
		else stop();
	};

	for (const type of INTERRUPTS) window.addEventListener(type, stop, { passive: true });
	frame = requestAnimationFrame(step);
	cancel = stop;
}
