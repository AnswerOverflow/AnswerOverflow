import { Heading } from '@answeroverflow/ui/ui/heading';
import { Link } from '@answeroverflow/ui/ui/link';
import { Paragraph } from '@answeroverflow/ui/ui/paragraph';
import type { MDXComponents } from 'mdx/types';

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
