import NextLink from 'next/link';
import React from 'react';

export default function Link(
	props: React.ComponentPropsWithoutRef<typeof NextLink>,
) {
	return <NextLink prefetch={false} {...props} />;
}
