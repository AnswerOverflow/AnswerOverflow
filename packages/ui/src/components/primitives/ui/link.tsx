import type NextLink from 'next/link';
import React from 'react';

export default function Link(
	props: React.ComponentPropsWithoutRef<typeof NextLink> & {
		href: string;
	},
) {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { prefetch, ...rest } = props;
	return <a {...rest} />;
}
