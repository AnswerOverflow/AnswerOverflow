import { twMerge } from 'tailwind-merge';

export interface HeadingProps
	extends React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>> {}

const mutualClasses = 'text-ao-black dark:text-ao-white py-2 font-header';

const H1 = (props: HeadingProps) => {
	const { children, className, ...otherProps }: HeadingProps = props;

	return (
		<h1
			className={`${twMerge(
				'text-5xl font-bold',
				`${className ?? ''}`,
			)} ${mutualClasses}`}
			{...otherProps}
		>
			{children}
		</h1>
	);
};

const H2 = (props: HeadingProps) => {
	const { children, className, ...otherProps }: HeadingProps = props;

	return (
		<h2
			className={`${twMerge(
				'text-4xl font-semibold',
				`${className ?? ''}`,
			)} ${mutualClasses}`}
			{...otherProps}
		>
			{children}
		</h2>
	);
};

const H3 = (props: HeadingProps) => {
	const { children, className, ...otherProps }: HeadingProps = props;

	return (
		<h3
			className={`${twMerge(
				'text-2xl font-medium',
				`${className ?? ''}`,
			)} ${mutualClasses}`}
			{...otherProps}
		>
			{children}
		</h3>
	);
};

const H4 = (props: HeadingProps) => {
	const { children, className, ...otherProps }: HeadingProps = props;

	return (
		<h4
			className={`${twMerge(
				'text-2xl',
				`${className ?? ''}`,
			)} ${mutualClasses}`}
			{...otherProps}
		>
			{children}
		</h4>
	);
};

const H5 = (props: HeadingProps) => {
	const { children, className, ...otherProps }: HeadingProps = props;

	return (
		<h5
			className={`${twMerge('text-xl', `${className ?? ''}`)} ${mutualClasses}`}
			{...otherProps}
		>
			{children}
		</h5>
	);
};

const H6 = (props: HeadingProps) => {
	const { children, className, ...otherProps }: HeadingProps = props;

	return (
		<h6
			className={`text-xl ${mutualClasses} ${className ?? ''}`}
			{...otherProps}
		>
			{children}
		</h6>
	);
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Heading = {
	H1,
	H2,
	H3,
	H4,
	H5,
	H6,
};
