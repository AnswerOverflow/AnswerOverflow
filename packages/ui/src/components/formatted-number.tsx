"use client";

export function FormattedNumber(props: { value: number }) {
	return <>{new Intl.NumberFormat("en-US").format(props.value)}</>;
}
