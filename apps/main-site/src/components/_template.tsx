import Link from 'next/link';
import type { Components } from '@mdx-js/react/lib';
import { Paragraph } from '~ui/components/primitives/base/Paragraph';
import { Heading } from '~ui/components/primitives/base/Heading';
import { MDXProvider } from '@mdx-js/react';
import { ToastContainer } from 'react-toastify';
import React from 'react';

const components: Components = {
	h1: Heading.H1,
	h2: Heading.H2,
	h3: Heading.H3,
	h4: Heading.H4,
	h5: Heading.H5,
	h6: Heading.H6,
	p: Paragraph,
	ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
		<ul {...props} className="list-disc pl-10" />
	),
	a: (
		props: React.DetailedHTMLProps<
			React.AnchorHTMLAttributes<HTMLAnchorElement>,
			HTMLAnchorElement
		>,
	) => (
		<Link
			href={props.href ?? ''}
			className="font-bold underline decoration-2 underline-offset-2 transition-colors hover:decoration-blue-500"
			target="_blank"
		>
			{props.children}
		</Link>
	),
};

export default function _template({ children }: { children: React.ReactNode }) {
	return (
		<>
			<ToastContainer toastClassName="bg-background dark:bg-background text-primary dark:text-primary" />
			<MDXProvider components={components}>{children}</MDXProvider>
		</>
	);
}
