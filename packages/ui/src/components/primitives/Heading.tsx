export interface HeadingProps
	extends Omit<
		React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>>,
		'className'
	> {
	classNameOverride?: string;
}

const mutualClasses = 'text-ao-black dark:text-ao-white py-2 font-header';

const H1 = (props: HeadingProps) => {
	const { children, classNameOverride, ...otherProps }: HeadingProps = props;

	return (
		<h1
			className={`text-5xl font-bold ${mutualClasses} ${
				classNameOverride ?? ''
			}`}
			{...otherProps}
		>
			{children}
		</h1>
	);
};

const H2 = (props: HeadingProps) => {
	const { children, classNameOverride, ...otherProps }: HeadingProps = props;

	return (
		<h2
			className={`text-4xl font-semibold ${mutualClasses} ${
				classNameOverride ?? ''
			}`}
			{...otherProps}
		>
			{children}
		</h2>
	);
};

const H3 = (props: HeadingProps) => {
	const { children, classNameOverride, ...otherProps }: HeadingProps = props;

	return (
		<h3
			className={`text-2xl font-medium ${mutualClasses} ${
				classNameOverride ?? ''
			}`}
			{...otherProps}
		>
			{children}
		</h3>
	);
};

const H4 = (props: HeadingProps) => {
	const { children, classNameOverride, ...otherProps }: HeadingProps = props;

	return (
		<h4
			className={`text-2xl ${mutualClasses} ${classNameOverride ?? ''}`}
			{...otherProps}
		>
			{children}
		</h4>
	);
};

const H5 = (props: HeadingProps) => {
	const { children, classNameOverride, ...otherProps }: HeadingProps = props;

	return (
		<h5
			className={`text-xl ${mutualClasses} ${classNameOverride ?? ''}`}
			{...otherProps}
		>
			{children}
		</h5>
	);
};

const H6 = (props: HeadingProps) => {
	const { children, classNameOverride, ...otherProps }: HeadingProps = props;

	return (
		<h6
			className={`text-xl ${mutualClasses} ${classNameOverride ?? ''}`}
			{...otherProps}
		>
			{children}
		</h6>
	);
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Heading = {
	H1: H1,
	H2: H2,
	H3: H3,
	H4: H4,
	H5: H5,
	H6: H6,
};
