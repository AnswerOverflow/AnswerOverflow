import type { MDXComponents } from 'mdx/types';
import { Heading } from '@answeroverflow/ui/src/components/primitives/base/Heading';
import { Paragraph } from '@answeroverflow/ui/src/components/primitives/base/Paragraph';
import Link from '@answeroverflow/ui/src/components/primitives/base/Link';

export function useMDXComponents(components: MDXComponents): MDXComponents {
	return {
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
		...components,
	};
}
