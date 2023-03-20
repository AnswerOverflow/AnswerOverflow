import type { VariantProps } from 'cva';
import Link from 'next/link';
import type { SetRequired } from 'type-fest';
import { cn } from '~ui/utils/styling';
import { buttonVariants } from './Button';

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
}: LinkButtonProps) => {
	return (
		<Link
			href={href}
			className={cn(buttonVariants({ variant, size, className }))}
			target="_blank"
			{...props}
		>
			{children}
		</Link>
	);
};
