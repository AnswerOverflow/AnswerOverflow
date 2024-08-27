import { cn } from '../utils/utils';

export const Paragraph = (
	props: React.PropsWithChildren<React.HTMLAttributes<HTMLParagraphElement>>,
) => {
	const { children, className, ...otherProps } = props;

	return (
		<p
			className={cn('font-body text-primary py-4 text-lg', className)}
			{...otherProps}
		>
			{children}
		</p>
	);
};
