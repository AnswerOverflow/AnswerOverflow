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
		<header className="fixed left-0 top-0 z-[1000] h-navbar w-full bg-background px-4">
			<nav className="relative z-10 flex size-full flex-1 items-center justify-between border-b-2 pb-2 md:py-2">
				<div>{leftContent}</div>
				{centerContent && (
					<div className="absolute left-1/2 top-1/2 hidden w-full max-w-[620px] -translate-x-1/2 -translate-y-1/2 2xl:block">
						{centerContent}
					</div>
				)}
				<div className="flex items-center gap-2">{rightContent}</div>
			</nav>
		</header>
	);
}
