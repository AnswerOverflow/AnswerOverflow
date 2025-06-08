'use client';
import NextLink from 'next/link';
import React from 'react';
import { cn } from '../utils/utils';
import { useTenant } from '../context/tenant-context';
export function Link(
	props: React.ComponentPropsWithoutRef<typeof NextLink> & {
		href: string;
		icon?: React.ReactNode;
	},
) {
	const { icon, className, ...rest } = props;
	const tenant = useTenant();
	const isRelative = rest.href.startsWith('/');
	const doesStartWithSubpathAlready =
		rest.href.startsWith(tenant?.subpath ?? '') ||
		rest.href.startsWith(`/${tenant?.subpath}`);
	const finalHref =
		tenant?.subpath && isRelative && !doesStartWithSubpathAlready
			? `/${tenant.subpath}${rest.href}`
			: rest.href;

	if (icon)
		return (
			<NextLink
				prefetch={false}
				{...rest}
				href={finalHref}
				className={cn('flex flex-row items-center gap-2', className)}
			>
				{props.icon}
				{props.children}
			</NextLink>
		);
	return <NextLink prefetch={false} {...props} href={finalHref} />;
}
