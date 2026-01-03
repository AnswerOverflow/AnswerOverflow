import * as React from "react";

export function useHideOnScroll(
	enabled: boolean,
	scrollContainer?: HTMLElement | null,
	onHiddenChange?: (isHidden: boolean) => void,
) {
	const [isHidden, setIsHidden] = React.useState(false);
	const lastScrollY = React.useRef(0);

	React.useEffect(() => {
		if (!enabled) {
			setIsHidden(false);
			onHiddenChange?.(false);
			return;
		}

		const handleScroll = () => {
			const currentScrollY = scrollContainer
				? scrollContainer.scrollTop
				: window.scrollY;
			const scrollingDown = currentScrollY > lastScrollY.current;
			const scrolledPastThreshold = currentScrollY > 60;

			if (scrollingDown && scrolledPastThreshold) {
				setIsHidden(true);
				onHiddenChange?.(true);
			} else if (!scrollingDown) {
				setIsHidden(false);
				onHiddenChange?.(false);
			}

			lastScrollY.current = currentScrollY;
		};

		const target = scrollContainer ?? window;
		target.addEventListener("scroll", handleScroll, { passive: true });
		return () => target.removeEventListener("scroll", handleScroll);
	}, [enabled, scrollContainer, onHiddenChange]);

	return isHidden;
}
