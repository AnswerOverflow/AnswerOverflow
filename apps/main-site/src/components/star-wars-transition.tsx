"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

/**
 * Star Wars-style wipe transitions for April Fools 2026.
 *
 * Intercepts internal link clicks, uses the View Transitions API
 * to screenshot the old page, then animates the old screenshot away
 * with a random Star Wars wipe — revealing the new page underneath.
 *
 * Auto-disables after April 1 2026 and respects prefers-reduced-motion.
 * Users can also dismiss it with a small button in the corner.
 *
 * CSS for the wipe animations lives in globals.css.
 */

const APRIL_FOOLS_2026 = new Date("2026-04-02T00:00:00");
const STORAGE_KEY = "sw-transitions-disabled";

const TRANSITION_NAMES = [
	"wipe-right",
	"wipe-left",
	"wipe-down",
	"wipe-up",
	"iris-close",
	"iris-open",
	"diamond",
	"star-wipe",
	"split-h",
	"split-v",
	"diagonal-tl",
	"diagonal-tr",
] as const;

function isAprilFools() {
	return new Date() < APRIL_FOOLS_2026;
}

function createTransitionBag() {
	let bag: string[] = [];
	return () => {
		if (bag.length === 0) {
			bag = [...TRANSITION_NAMES];
			// Fisher-Yates shuffle
			for (let i = bag.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[bag[i], bag[j]] = [bag[j]!, bag[i]!];
			}
		}
		return bag.pop()!;
	};
}

const nextTransition = createTransitionBag();

export function StarWarsTransition({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const transitioning = useRef(false);
	const [enabled, setEnabled] = useState(false);

	// Check on mount whether transitions should be active
	useEffect(() => {
		if (!isAprilFools()) return;
		if (localStorage.getItem(STORAGE_KEY) === "true") return;
		setEnabled(true);
	}, []);

	const disable = useCallback(() => {
		localStorage.setItem(STORAGE_KEY, "true");
		setEnabled(false);
	}, []);

	useEffect(() => {
		if (!enabled) return;

		function handleClick(e: MouseEvent) {
			if (transitioning.current) return;
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			if (e.defaultPrevented) return;
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

			const anchor = (e.target as HTMLElement).closest?.("a");
			if (!anchor) return;
			if (anchor.target === "_blank") return;

			const href = anchor.getAttribute("href");
			if (!href) return;

			// Only intercept same-origin navigations to a different path
			try {
				const url = new URL(href, window.location.origin);
				if (url.origin !== window.location.origin) return;
				if (url.pathname === window.location.pathname) return;
			} catch {
				return;
			}

			// Bail if the browser doesn't support View Transitions
			if (!("startViewTransition" in document)) return;

			e.preventDefault();
			e.stopPropagation();

			transitioning.current = true;

			const name = nextTransition();
			document.documentElement.dataset.swTransition = name;

			const vt = (document as any).startViewTransition(() => {
				ReactDOM.flushSync(() => {
					router.push(href);
				});
			});

			vt.finished.finally(() => {
				transitioning.current = false;
				delete document.documentElement.dataset.swTransition;
			});
		}

		document.addEventListener("click", handleClick, true);
		return () => document.removeEventListener("click", handleClick, true);
	}, [router, enabled]);

	if (!enabled) return <>{children}</>;

	return (
		<>
			{children}
			<button
				type="button"
				onClick={disable}
				aria-label="Disable page transitions"
				style={{
					position: "fixed",
					bottom: "1rem",
					right: "1rem",
					zIndex: 99998,
					padding: "0.375rem 0.75rem",
					fontSize: "0.75rem",
					lineHeight: 1,
					borderRadius: "9999px",
					border: "1px solid var(--border)",
					background: "var(--background)",
					color: "var(--muted-foreground)",
					cursor: "pointer",
					opacity: 0.7,
					transition: "opacity 0.15s",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.opacity = "1";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.opacity = "0.7";
				}}
			>
				Disable transitions
			</button>
		</>
	);
}
