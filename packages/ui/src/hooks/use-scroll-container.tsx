"use client";

import {
	createContext,
	useContext,
	useState,
	type Dispatch,
	type SetStateAction,
} from "react";

type ScrollContainerContextValue = {
	scrollContainer: HTMLElement | null;
	setScrollContainer: Dispatch<SetStateAction<HTMLElement | null>>;
	isNavbarHidden: boolean;
	setIsNavbarHidden: Dispatch<SetStateAction<boolean>>;
};

const ScrollContainerContext = createContext<ScrollContainerContextValue>({
	scrollContainer: null,
	setScrollContainer: () => {},
	isNavbarHidden: false,
	setIsNavbarHidden: () => {},
});

export function ScrollContainerProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(
		null,
	);
	const [isNavbarHidden, setIsNavbarHidden] = useState(false);

	return (
		<ScrollContainerContext.Provider
			value={{
				scrollContainer,
				setScrollContainer,
				isNavbarHidden,
				setIsNavbarHidden,
			}}
		>
			{children}
		</ScrollContainerContext.Provider>
	);
}

export function useScrollContainer() {
	return useContext(ScrollContainerContext);
}

export function useIsNavbarHidden() {
	return useContext(ScrollContainerContext).isNavbarHidden;
}
