"use client";
import NextLink from "next/link";
import type React from "react";
import { cn } from "../lib/utils";

export function Link(
	props: React.ComponentPropsWithoutRef<typeof NextLink> & {
		href: string;
		icon?: React.ReactNode;
	},
) {
	const { icon, className, ...rest } = props;

	if (icon)
		return (
			<NextLink
				prefetch={false}
				{...rest}
				href={rest.href}
				className={cn("flex flex-row items-center gap-2", className)}
			>
				{props.icon}
				{props.children}
			</NextLink>
		);
	return <NextLink prefetch={false} {...props} href={rest.href} />;
}
