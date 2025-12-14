"use client";
import NextLink from "next/link";
import type React from "react";
import { cn } from "../lib/utils";
import { normalizeSubpath } from "../utils/links";
import { useTenant } from "./tenant-context";

function isExternalUrl(href: string): boolean {
	if (!href.startsWith("http://") && !href.startsWith("https://")) {
		return false;
	}
	try {
		const url = new URL(href);
		const currentHost =
			typeof window !== "undefined" ? window.location.host : null;
		if (currentHost === null) {
			const mainSiteHosts = [
				"www.answeroverflow.com",
				"answeroverflow.com",
				"www.answeroverflow.com",
				"localhost",
				"localhost:3000",
			];
			return !mainSiteHosts.some(
				(host) => url.host === host || url.host.endsWith(".vercel.app"),
			);
		}
		return url.host !== currentHost;
	} catch {
		return false;
	}
}

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

	const isExternal = isExternalUrl(finalHref);

	if (isExternal) {
		const { prefetch, replace, scroll, shallow, passHref, ...anchorProps } =
			rest;
		if (icon) {
			return (
				<a
					{...anchorProps}
					href={finalHref}
					className={cn("flex flex-row items-center gap-2", className)}
				>
					{props.icon}
					{props.children}
				</a>
			);
		}
		return (
			<a {...anchorProps} href={finalHref} className={className}>
				{props.children}
			</a>
		);
	}

	if (icon)
		return (
			<NextLink
				scroll={true}
				{...rest}
				href={finalHref}
				className={cn("flex flex-row items-center gap-2", className)}
			>
				{props.icon}
				{props.children}
			</NextLink>
		);
	return <NextLink scroll={true} {...props} href={finalHref} />;
}
