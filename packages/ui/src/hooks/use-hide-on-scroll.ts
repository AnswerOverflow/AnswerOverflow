import * as React from "react";

export function useHideOnScroll(enabled: boolean) {
	const [isHidden, setIsHidden] = React.useState(false);
	const lastScrollY = React.useRef(0);

	React.useEffect(() => {
		if (!enabled) {
			setIsHidden(false);
			return;
		}

		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			const scrollingDown = currentScrollY > lastScrollY.current;
			const scrolledPastThreshold = currentScrollY > 60;

			if (scrollingDown && scrolledPastThreshold) {
				setIsHidden(true);
			} else if (!scrollingDown) {
				setIsHidden(false);
			}

			lastScrollY.current = currentScrollY;
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, [enabled]);

	return isHidden;
}
