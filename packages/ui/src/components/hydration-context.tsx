"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useRef,
	useSyncExternalStore,
} from "react";

declare global {
	interface Window {
		__REACT_HYDRATED__?: boolean;
	}
}

export function isHydrated(): boolean {
	if (typeof window === "undefined") return false;
	return window.__REACT_HYDRATED__ === true;
}

type HydrationContextValue = {
	isHydrationRender: () => boolean;
	subscribe: (callback: () => void) => () => void;
};

const HydrationContext = createContext<HydrationContextValue | null>(null);

export function HydrationProvider({ children }: { children: ReactNode }) {
	const isHydrationRenderRef = useRef(true);
	const subscribersRef = useRef(new Set<() => void>());

	useEffect(() => {
		isHydrationRenderRef.current = false;
		window.__REACT_HYDRATED__ = true;
		for (const callback of subscribersRef.current) {
			callback();
		}
	}, []);

	const contextValue = useRef<HydrationContextValue>({
		isHydrationRender: () => isHydrationRenderRef.current,
		subscribe: (callback) => {
			subscribersRef.current.add(callback);
			return () => subscribersRef.current.delete(callback);
		},
	});

	return (
		<HydrationContext.Provider value={contextValue.current}>
			{children}
		</HydrationContext.Provider>
	);
}

export function useIsHydrationRender() {
	const context = useContext(HydrationContext);
	if (!context) {
		throw new Error(
			"useIsHydrationRender must be used within a HydrationProvider",
		);
	}

	return useSyncExternalStore(
		context.subscribe,
		context.isHydrationRender,
		() => true,
	);
}
