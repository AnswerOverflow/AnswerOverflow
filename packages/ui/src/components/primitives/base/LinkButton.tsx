'use client';
import type { VariantProps } from 'cva';
import Link from '~ui/components/primitives/base/Link';
import type { SetRequired } from 'type-fest';
import { cn } from '~ui/utils/styling';
import { buttonVariants } from '~ui/components/primitives/ui/button';

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
