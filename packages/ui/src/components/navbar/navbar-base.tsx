"use client";

import type * as React from "react";
import { useCallback } from "react";
import { useHideOnScroll } from "../../hooks/use-hide-on-scroll";
import { useIsMobile } from "../../hooks/use-mobile";
import { useScrollContainer } from "../../hooks/use-scroll-container";
import { cn } from "../../lib/utils";
import { useIsImpersonating } from "../impersonation-banner";

export interface NavbarBaseProps {
	leftContent?: React.ReactNode;
	centerContent?: React.ReactNode;
	rightContent?: React.ReactNode;
}

export function NavbarBase({
	leftContent,
	centerContent,
	rightContent,
}: NavbarBaseProps) {
	const isImpersonating = useIsImpersonating();
	const isMobile = useIsMobile();
	const { scrollContainer, setIsNavbarHidden } = useScrollContainer();
	const onHiddenChange = useCallback(
		(hidden: boolean) => setIsNavbarHidden(hidden),
		[setIsNavbarHidden],
	);
	const isHidden = useHideOnScroll(isMobile, scrollContainer, onHiddenChange);

	return (
		<header
			className={cn(
				"fixed left-0 z-40 h-navbar w-full bg-background/95 backdrop-blur-sm border-b border-border px-4 transition-transform duration-300",
				isHidden && "-translate-y-full",
			)}
			style={{ top: isImpersonating ? "40px" : "0" }}
		>
			<nav className="relative z-10 flex size-full flex-1 items-center justify-between gap-4">
				<div className="shrink-0">{leftContent}</div>
				{centerContent && (
					<div className="hidden xl:flex flex-1 justify-center max-w-2xl mx-4">
						{centerContent}
					</div>
				)}
				<div className="flex items-center gap-2 shrink-0">{rightContent}</div>
			</nav>
		</header>
	);
}
