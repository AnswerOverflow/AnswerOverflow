"use client";

import type * as React from "react";
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

	return (
		<header
			className="fixed left-0 z-40 h-navbar w-full bg-background/95 backdrop-blur-sm border-b border-border px-4"
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
