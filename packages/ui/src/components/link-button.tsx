"use client";

import type { VariantProps } from "class-variance-authority";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { Button, type buttonVariants } from "./button";
import { Link } from "./link";

export interface LinkButtonProps
	extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
		VariantProps<typeof buttonVariants> {
	href: string;
	children?: React.ReactNode;
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
	const finalVariant = isSelected ? selectedVariant : variant;

	return (
		<Button asChild variant={finalVariant} size={size} className={className}>
			<Link href={href} className="no-underline hover:no-underline" {...props}>
				{children}
			</Link>
		</Button>
	);
}
