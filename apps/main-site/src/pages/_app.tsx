// src/pages/App.tsx
import "core-js/actual";
import '../styles/globals.css';
import '../styles/code.scss';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { AppType } from 'next/app';
import hljs from 'highlight.js';
import { NextTRPC, PageWrapper, trpc, ThemeProvider } from '@answeroverflow/ui';
import React, { useEffect } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Heading, Paragraph } from '@answeroverflow/ui';
import { MDXProvider } from '@mdx-js/react';
import { useAnalytics } from '@answeroverflow/hooks';
import Link from 'next/link';
import type { Components } from '@mdx-js/react/lib';

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
			className="font-bold underline decoration-2 underline-offset-2 transition-colors hover:decoration-ao-blue"
			target="_blank"
		>
			{props.children}
		</Link>
	),
};

// eslint-disable-next-line @typescript-eslint/naming-convention
const MyApp: AppType<{ session: Session | null }> = ({
	Component,
	pageProps: { session, ...pageProps },
}) => {
	useEffect(() => {
		hljs.configure({
			ignoreUnescapedHTML: true, // TODO: Revisit this, discord-markdown escapes the HTML so it should be safe
		});
		hljs.highlightAll();
	}, []);

	// TODO: wow this is ugly but use analytics needs session provider data
	const WithAnalytics = ({ children }: { children: React.ReactNode }) => {
		useAnalytics();
		return <>{children}</>;
	};

	return (
		<ThemeProvider>
			<SessionProvider session={session}>
				<WithAnalytics>
					<PageWrapper disabledRoutes={['/', '/c/[communityId]']}>
						<MDXProvider components={components}>
							<Component {...pageProps} />
						</MDXProvider>
					</PageWrapper>
					<ReactQueryDevtools initialIsOpen={false} />
				</WithAnalytics>
			</SessionProvider>
		</ThemeProvider>
	);
};
export default (trpc as NextTRPC).withTRPC(MyApp);
