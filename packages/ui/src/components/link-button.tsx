"use client";

import type * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import { buttonVariants } from "./button";
import { Link } from "./link";

export interface LinkButtonProps
	extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
		VariantProps<typeof buttonVariants> {
	href: string;
	children: React.ReactNode;
	prefetch?: boolean;
	selectedVariant?: VariantProps<typeof buttonVariants>["variant"];
}

export function LinkButton({
	children,
	href,
	variant,
	size,
	className,
	selectedVariant,
	...props
}: LinkButtonProps) {
	const pathname = usePathname();
	const isSelected = href === pathname && selectedVariant;

	return (
		<Link
			href={href}
			className={cn(
				buttonVariants({
					variant: isSelected ? selectedVariant : variant,
					size,
					className,
				}),
			)}
			{...props}
		>
			{children}
		</Link>
	);
}
