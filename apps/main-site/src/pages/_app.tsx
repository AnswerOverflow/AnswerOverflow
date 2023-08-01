// src/pages/App.tsx
import 'core-js/actual';
import '../styles/globals.css';
import '../styles/code.scss';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { AppType, NextWebVitalsMetric } from 'next/app';
import hljs from 'highlight.js';
import { ThemeProvider } from 'next-themes';
import {
	AnalyticsProvider,
	TenantContextProvider,
} from '@answeroverflow/hooks';
import React, { useEffect } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MDXProvider } from '@mdx-js/react';
import Link from 'next/link';
import type { Components } from '@mdx-js/react/lib';
import { CommitBanner } from '@answeroverflow/ui/src/components/dev/CommitBanner';
import ProgressBar from '@badrap/bar-of-progress';
import Router from 'next/router';
import type { ServerPublic } from '@answeroverflow/api';
import { ToastContainer } from 'react-toastify';
import { GoogleAnalytics, event } from 'nextjs-google-analytics';
import { Heading } from '@answeroverflow/ui/src/components/primitives/base/Heading';
import { PageWrapper } from '@answeroverflow/ui/src/components/pages/PageWrapper';
import { NextTRPC, trpc } from '@answeroverflow/ui/src/utils/trpc';
import { Paragraph } from '@answeroverflow/ui/src/components/primitives/base/Paragraph';

const progress = new ProgressBar({
	size: 2,
	color: '#0094ff',
	className: 'bar-of-progress',
	delay: 100,
});

Router.events.on('routeChangeStart', progress.start);
Router.events.on('routeChangeComplete', progress.finish);
Router.events.on('routeChangeError', progress.finish);

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

export function reportWebVitals({
	id,
	name,
	label,
	value,
}: NextWebVitalsMetric) {
	event(name, {
		category: label === 'web-vital' ? 'Web Vitals' : 'Next.js custom metric',
		value: Math.round(name === 'CLS' ? value * 1000 : value), // values must be integers
		label: id, // id unique to current page load
		nonInteraction: true, // avoids affecting bounce rate.
	});
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const MyApp: AppType<{
	session: Session | null;
	tenant: ServerPublic | undefined;
}> = ({ Component, pageProps: { session, ...pageProps } }) => {
	useEffect(() => {
		hljs.configure({
			ignoreUnescapedHTML: true,
		});
		hljs.highlightAll();
	}, []);

	return (
		<TenantContextProvider value={pageProps.tenant}>
			<ThemeProvider attribute="class" defaultTheme={'dark'} enableSystem>
				<SessionProvider session={session}>
					<AnalyticsProvider>
						<PageWrapper
							disabledRoutes={[
								'/',
								'/c/[communityId]',
								'/onboarding',
								'/[domain]',
								'/dashboard',
								'/dashboard/[serverId]',
							]}
						>
							<CommitBanner />
							<MDXProvider components={components}>
								<Component {...pageProps} />
								<ToastContainer toastClassName="bg-background dark:bg-background text-primary dark:text-primary" />
							</MDXProvider>
						</PageWrapper>
						<ReactQueryDevtools initialIsOpen={false} />
					</AnalyticsProvider>
				</SessionProvider>
			</ThemeProvider>
			<GoogleAnalytics trackPageViews />
		</TenantContextProvider>
	);
};
export default (trpc as NextTRPC).withTRPC(MyApp);
