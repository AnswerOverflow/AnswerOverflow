'use client';
export function FormattedNumber(props: {
	value: number;
	options?: Intl.NumberFormatOptions;
}) {
	const formatter = new Intl.NumberFormat('en-US', {
		notation: 'compact',
		compactDisplay: 'short',
		...props.options,
	});

	return <span>{formatter.format(props.value)}</span>;
}
