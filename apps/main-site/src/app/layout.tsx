import '../styles/globals.css';
import '../styles/code.scss';
import React from 'react';
import { Providers } from '../components/providers';
import Script from 'next/script';
import { CommitBanner } from '@answeroverflow/ui/src/components/dev/CommitBanner';
import { webClientEnv } from '@answeroverflow/env/web';
import { getServerSession } from '@answeroverflow/auth';
import { DATA_UNBLOCKER } from '../utils/data-unblocker';
import { Montserrat, Source_Sans_3 } from 'next/font/google';
import type { Metadata } from 'next';
export const metadata: Metadata = {
	title: 'Answer Overflow - Search all of Discord',
	metadataBase: new URL('https://www.answeroverflow.com/'),
	description:
		'Build the best Discord support server with Answer Overflow. Index your content into Google, answer questions with AI, and gain insights into your community.',
	robots: {
		index: webClientEnv.NEXT_PUBLIC_DEPLOYMENT_ENV === 'production',
		follow: webClientEnv.NEXT_PUBLIC_DEPLOYMENT_ENV === 'production',
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
	variable: '--font-montserrat',
});
const sourceSans3 = Source_Sans_3({
	subsets: ['latin'],
	display: 'swap',
	variable: '--font-source-sans-3',
});

export default async function RootLayout({
	// Layouts must accept a children prop.
	// This will be populated with nested layouts or pages
	children,
}: {
	children: React.ReactNode;
}) {
	// TODO: Session really shouldn't block first byte
	const session = await getServerSession();

	return (
		// suppressHydrationWarning makes next themes doesn't error, other hydration errors are still shown
		<html lang="en" suppressHydrationWarning>
			<body className={`${montserrat.variable} ${sourceSans3.variable}`}>
				<CommitBanner />
				<Providers session={session}>{children}</Providers>
				<Script
					id="google-tag-manager"
					strategy={'lazyOnload'}
					src={`https://www.googletagmanager.com/gtag/js?id=${webClientEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID!}`}
				/>
				<Script id="google-analytics" strategy={'lazyOnload'}>
					{`
				  		window.dataLayer = window.dataLayer || [];
				  		function gtag(){dataLayer.push(arguments);}
				  		gtag('js', new Date());

				  		gtag('config', '${webClientEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID!}');
				`}
				</Script>
				<Script
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
