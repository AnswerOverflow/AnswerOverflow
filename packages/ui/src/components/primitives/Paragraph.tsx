export interface ParagraphProps
	extends Omit<
		React.PropsWithChildren<React.HTMLAttributes<HTMLParagraphElement>>,
		'className'
	> {
	classNameOverride?: string;
}

export const Paragraph = (props: ParagraphProps) => {
	const { children, classNameOverride, ...otherProps }: ParagraphProps = props;

	return (
		<p
			className={`py-4 font-body text-lg text-ao-black dark:text-ao-white ${
				classNameOverride ?? ''
			}`}
			{...otherProps}
		>
			{children}
		</p>
	);
};
