"use client";
import NextLink from "next/link";
import type React from "react";
import { useTenant } from "./tenant-context";
import { cn } from "../lib/utils";
import { normalizeSubpath } from "../utils/links";

export function Link(
	props: React.ComponentPropsWithoutRef<typeof NextLink> & {
		href: string;
		icon?: React.ReactNode;
	},
) {
	const { icon, className, ...rest } = props;
	const tenant = useTenant();
	const tenantSubpath = normalizeSubpath(tenant?.subpath);
	const isRelative = rest.href.startsWith("/");
	const startsWithSubpath =
		tenantSubpath &&
		(rest.href === `/${tenantSubpath}` ||
			rest.href.startsWith(`/${tenantSubpath}/`));
	const finalHref =
		tenantSubpath && isRelative && !startsWithSubpath
			? `/${tenantSubpath}${rest.href}`
			: rest.href;

	if (icon)
		return (
			<NextLink
				prefetch={false}
				{...rest}
				href={finalHref}
				className={cn("flex flex-row items-center gap-2", className)}
			>
				{props.icon}
				{props.children}
			</NextLink>
		);
	return <NextLink prefetch={false} {...props} href={finalHref} />;
}
