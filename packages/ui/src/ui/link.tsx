import NextLink from 'next/link';
import React from 'react';
export default function Link(
	props: React.ComponentPropsWithoutRef<typeof NextLink> & {
		href: string;
	},
) {
	return <NextLink prefetch={true} {...props} />;
}
