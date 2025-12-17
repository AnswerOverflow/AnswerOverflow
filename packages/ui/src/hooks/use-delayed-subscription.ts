import { useCallback, useEffect, useRef, useState } from "react";

export const CONVEX_SUBSCRIPTION_DELAY_MS = 30 * 1000;

type UseDelayedSubscriptionOptions = {
	hasInitialData: boolean;
	delayMs?: number;
};

type UseDelayedSubscriptionReturn = {
	shouldSkip: boolean;
	forceEnable: () => void;
};

export function useDelayedSubscription({
	hasInitialData,
	delayMs = CONVEX_SUBSCRIPTION_DELAY_MS,
}: UseDelayedSubscriptionOptions): UseDelayedSubscriptionReturn {
	const [isDelayActive, setIsDelayActive] = useState(hasInitialData);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hasEnabledRef = useRef(!hasInitialData);

	useEffect(() => {
		if (!hasInitialData || hasEnabledRef.current) {
			return;
		}

		timeoutRef.current = setTimeout(() => {
			setIsDelayActive(false);
			hasEnabledRef.current = true;
		}, delayMs);

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [hasInitialData, delayMs]);

	const forceEnable = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		setIsDelayActive(false);
		hasEnabledRef.current = true;
	}, []);

	return {
		shouldSkip: isDelayActive,
		forceEnable,
	};
}
