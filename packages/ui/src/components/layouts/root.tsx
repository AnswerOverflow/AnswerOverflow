/* eslint-disable n/no-process-env */
import React, { Suspense } from 'react';
import { Providers } from './providers';
import { CommitBanner } from '../dev/commit-banner';
import { getServerSession } from '@answeroverflow/auth';
import { Montserrat, Source_Sans_3 } from 'next/font/google';
import type { Metadata } from 'next';
import {
	AnalyticsProvider,
	PostHogPageview,
} from '@answeroverflow/hooks/src/analytics/client';
import Script from 'next/script';
import { DATA_UNBLOCKER } from './data-unblocker';
import { AxiomWebVitals } from 'next-axiom';

export const metadata: Metadata = {
	title: 'Answer Overflow - Search all of Discord',
	metadataBase: new URL('https://www.answeroverflow.com/'),
	description:
		'Build the best Discord support server with Answer Overflow. Index your content into Google, answer questions with AI, and gain insights into your community.',
	robots: {
		// eslint-disable-next-line n/no-process-env
		index: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'production',
		// eslint-disable-next-line n/no-process-env
		follow: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'production',
	},
	openGraph: {
		type: 'website',
		title: 'Answer Overflow - Search all of Discord',
		siteName: 'Answer Overflow',
		description:
			'Build the best Discord support server with Answer Overflow. Index your content into Google, answer questions with AI, and gain insights into your community.',
		images: [
			{
				url: 'https://www.answeroverflow.com/answer-overflow-banner-v3.png',
				width: 1200,
				height: 630,
			},
		],
	},
};
const montserrat = Montserrat({
	subsets: ['latin'],
	display: 'swap',
	weight: ['400', '500', '600', '700'],
	variable: '--font-montserrat',
});
const sourceSans3 = Source_Sans_3({
	subsets: ['latin'],
	display: 'swap',
	weight: ['400', '500', '600', '700'],
	variable: '--font-source-sans-3',
});

async function AnalyticsWithSession() {
	const session = await getServerSession();
	return <AnalyticsProvider session={session} />;
}

export function Layout({
	// Layouts must accept a children prop.
	// This will be populated with nested layouts or pages
	children,
}: {
	children: React.ReactNode;
}) {
	// TODO: Session really shouldn't block first byte
	return (
		// suppressHydrationWarning makes next themes doesn't error, other hydration errors are still shown
		<html
			lang="en"
			suppressHydrationWarning
			className={'dark'}
			style={{
				colorScheme: 'dark',
			}}
		>
			{/* eslint-disable-next-line @next/next/no-head-element */}
			<head>
				<link rel={'preconnect'} href={'https://cdn.discordapp.com'} />
				<link rel={'dns-prefetch'} href={'https://cdn.discordapp.com'} />
				<link href="https://www.googletagmanager.com" rel="preconnect" />
				<script
					async
					src={`https://www.googletagmanager.com/gtag/js?id=${process.env
						.NEXT_PUBLIC_GA_MEASUREMENT_ID!}`}
					charSet="utf-8"
				/>
			</head>
			<body className={`${montserrat.variable} ${sourceSans3.variable}`}>
				<CommitBanner />

				<Providers>{children}</Providers>
				<AxiomWebVitals />

				<Suspense>
					<AnalyticsWithSession />
					<PostHogPageview />
				</Suspense>
				<Script id="google-analytics" strategy={'lazyOnload'} async>
					{`
				  		window.dataLayer = window.dataLayer || [];
				  		function gtag(){dataLayer.push(arguments);}
				  		gtag('js', new Date());

				  		gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!}');
				`}
				</Script>
				<Script
					async
					id="data-unblocker"
					strategy={'lazyOnload'}
					dangerouslySetInnerHTML={{
						__html: Buffer.from(DATA_UNBLOCKER, 'base64').toString(),
					}}
				/>
			</body>
		</html>
	);
}
