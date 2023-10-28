import React from 'react';
import { cn } from '~ui/utils/styling';
import type NextLink from 'next/link';

export const AOLink = (
	props: React.ComponentPropsWithoutRef<typeof NextLink> & {
		href: string;
	},
) => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { prefetch, className, ...rest } = props;
	return (
		<a
			className={cn(
				'text-blue-600 hover:underline dark:text-blue-400',
				className,
			)}
			{...rest}
		/>
	);
};
