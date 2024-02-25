import React from 'react';
import { cn } from '../utils/utils';
import Link from './link';

export const BlueLink = (
	props: React.ComponentPropsWithoutRef<typeof Link> & {
		href: string;
	},
) => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { prefetch, className, ...rest } = props;
	return (
		<Link
			className={cn(
				'text-blue-600 hover:underline dark:text-blue-400',
				className,
			)}
			{...rest}
		/>
	);
};
