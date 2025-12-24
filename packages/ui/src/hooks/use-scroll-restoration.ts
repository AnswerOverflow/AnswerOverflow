import { useCallback, useEffect, useRef } from "react";

const CACHE_PREFIX = "scroll-pos:";

function getCacheKey(key: string): string {
	return `${CACHE_PREFIX}${key}`;
}

function saveScrollPosition(key: string, position: number): void {
	try {
		sessionStorage.setItem(getCacheKey(key), String(position));
	} catch {
		// sessionStorage might be full or unavailable
	}
}

function getScrollPosition(key: string): number | null {
	try {
		const saved = sessionStorage.getItem(getCacheKey(key));
		if (saved !== null) {
			const position = parseInt(saved, 10);
			return Number.isNaN(position) ? null : position;
		}
	} catch {
		// sessionStorage might be unavailable
	}
	return null;
}

type UseScrollRestorationOptions = {
	key: string;
	enabled?: boolean;
	debounceMs?: number;
};

export function useScrollRestoration({
	key,
	enabled = true,
	debounceMs = 100,
}: UseScrollRestorationOptions) {
	const hasRestoredRef = useRef(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const restoreScroll = useCallback(() => {
		if (!enabled || hasRestoredRef.current) return false;

		const savedPosition = getScrollPosition(key);
		if (savedPosition !== null && savedPosition > 0) {
			window.scrollTo(0, savedPosition);
			hasRestoredRef.current = true;
			return true;
		}
		return false;
	}, [key, enabled]);

	useEffect(() => {
		if (!enabled) return;

		const handleScroll = () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			timeoutRef.current = setTimeout(() => {
				saveScrollPosition(key, window.scrollY);
			}, debounceMs);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });

		return () => {
			window.removeEventListener("scroll", handleScroll);
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [key, enabled, debounceMs]);

	useEffect(() => {
		hasRestoredRef.current = false;
	}, [key]);

	return {
		restoreScroll,
	};
}
