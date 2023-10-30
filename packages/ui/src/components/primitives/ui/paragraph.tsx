import { cn } from '../../../utils/utils';

export const Paragraph = (
	props: React.PropsWithChildren<React.HTMLAttributes<HTMLParagraphElement>>,
) => {
	const { children, className, ...otherProps } = props;

	return (
		<p
			className={cn('py-4 font-body text-lg text-primary', className)}
			{...otherProps}
		>
			{children}
		</p>
	);
};
