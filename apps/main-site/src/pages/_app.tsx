// src/pages/App.tsx
import 'core-js/actual';
import '../styles/globals.css';
import '../styles/code.scss';
import { SessionProvider } from '@answeroverflow/next-auth/react';
import type { Session } from '@answeroverflow/next-auth';
import type { AppType } from 'next/app';
import hljs from 'highlight.js';
import { NextTRPC, PageWrapper, trpc, ThemeProvider } from '@answeroverflow/ui';
import React, { useEffect } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Heading, Paragraph } from '@answeroverflow/ui';
import { MDXProvider } from '@mdx-js/react';
import { TenantContextProvider, useAnalytics } from '@answeroverflow/hooks';
import Link from 'next/link';
import type { Components } from '@mdx-js/react/lib';
import type { ServerPublic } from '@answeroverflow/api';

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
const MyApp: AppType<{
	session: Session | null;
	tenantData: ServerPublic | null;
}> = ({ Component, pageProps: { session, tenantData, ...pageProps } }) => {
	useEffect(() => {
		hljs.configure({
			ignoreUnescapedHTML: true,
		});
		hljs.highlightAll();
	}, []);

	// TODO: wow this is ugly but use analytics needs session provider data
	const WithAnalytics = ({ children }: { children: React.ReactNode }) => {
		useAnalytics();
		return <>{children}</>;
	};

	return (
		<TenantContextProvider value={tenantData}>
			<ThemeProvider>
				<SessionProvider
					session={session}
					basePath="http://localhost:3000/api/auth"
				>
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
		</TenantContextProvider>
	);
};
export default (trpc as NextTRPC).withTRPC(MyApp);
