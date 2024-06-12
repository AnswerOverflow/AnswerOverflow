import React from 'react';
import { cn } from '../utils/utils';
export default function Link(
	props:
		| React.DetailedHTMLProps<
				React.AnchorHTMLAttributes<HTMLAnchorElement>,
				HTMLAnchorElement
		  > & {
				href: string;
				icon?: React.ReactNode;
		  },
) {
	const { icon, className, ...rest } = props;
	if (icon)
		return (
			<a
				{...rest}
				className={cn('flex flex-row items-center gap-2', className)}
			>
				{props.icon}
				{props.children}
			</a>
		);
	return <a {...props} />;
}
