import NextLink from 'next/link';
import React from 'react';
import { cn } from '../utils/utils';
import { getGlobalThisValue } from '../global-this-embed';
export function Link(
	props: React.ComponentPropsWithoutRef<typeof NextLink> & {
		href: string;
		icon?: React.ReactNode;
	},
) {
	const { icon, className, ...rest } = props;
	const serverContent = getGlobalThisValue();
	const isRelative = rest.href.startsWith('/');
	const finalHref =
		serverContent?.subpath &&
		isRelative &&
		!rest.href.startsWith(serverContent.subpath)
			? `/${serverContent.subpath}${rest.href}`
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
