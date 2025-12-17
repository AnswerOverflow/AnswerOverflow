"use client";

export function FormattedNumber(props: { value: number }) {
	return (
		<span suppressHydrationWarning>
			{new Intl.NumberFormat("en-US").format(props.value)}
		</span>
	);
}
