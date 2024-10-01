'use client';
import type { VariantProps } from 'cva';
import Link from './link';
import type { SetRequired } from 'type-fest';
import { cn } from '../utils/utils';
// TODO: Check if this results in the JS for button being pulled in
import { buttonVariants } from './button';
import { usePathname } from 'next/navigation';

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
	selectedVariant?: LinkButtonProps['variant'];
}) => {
	const { selectedVariant, ...rest } = props;
	const pathname = usePathname();
	return (
		<Link
			href={href}
			className={cn(
				buttonVariants({
					variant:
						href === pathname && selectedVariant ? selectedVariant : variant,
					size,
					className,
				}),
			)}
			{...rest}
		>
			{children}
		</Link>
	);
};
