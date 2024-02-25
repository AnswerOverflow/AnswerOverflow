'use client';
import type { VariantProps } from 'cva';
import Link from './link';
import type { SetRequired } from 'type-fest';
import { cn } from '../utils/utils';
// TODO: Check if this results in the JS for button being pulled in
import { buttonVariants } from './button';

export interface LinkButtonProps
	extends SetRequired<
			React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>,
			'href'
		>,
		VariantProps<typeof buttonVariants> {}

export const LinkButton = ({
	children,
	href,
	variant,
	size,
	className,
	...props
}: LinkButtonProps & {
	prefetch?: boolean;
}) => {
	return (
		<Link
			href={href}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		>
			{children}
		</Link>
	);
};
