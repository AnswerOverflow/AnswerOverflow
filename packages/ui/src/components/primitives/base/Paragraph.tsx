import { twMerge } from 'tailwind-merge';

export const Paragraph = (
	props: React.PropsWithChildren<React.HTMLAttributes<HTMLParagraphElement>>,
) => {
	const { children, className, ...otherProps } = props;

	return (
		<p
			className={twMerge(
				'text-ao-black dark:text-ao-white py-4 font-body text-lg',
				className,
			)}
			{...otherProps}
		>
			{children}
		</p>
	);
};
