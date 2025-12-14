"use client";

import type * as React from "react";

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
	return (
		<header className="fixed left-0 top-0 z-[1000] h-navbar w-full bg-background/95 backdrop-blur-sm border-b border-border px-4">
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
