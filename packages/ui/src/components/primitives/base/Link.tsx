import Link from 'next/link';
import React from 'react';
import { cn } from '~ui/utils/styling';

export const AOLink = ({
	className,
	...rest
}: React.ComponentPropsWithoutRef<typeof Link>) => (
	<Link
		className={cn(
			'text-blue-600 hover:underline dark:text-blue-400',
			className,
		)}
		{...rest}
	/>
);
