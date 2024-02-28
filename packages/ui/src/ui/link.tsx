import NextLink from 'next/link';
import React from 'react';
export default function Link(
	props: React.HTMLAttributes<HTMLAnchorElement> & {
		href: string;
	},
) {
	return <a {...props} />;
}
