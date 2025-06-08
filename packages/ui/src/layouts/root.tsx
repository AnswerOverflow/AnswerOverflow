import type { Metadata } from 'next';
import { Montserrat, Source_Sans_3 } from 'next/font/google';
import React from 'react';

export const metadata: Metadata = {
	title: 'Answer Overflow - Discord Content Discovery',
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
		title: 'Answer Overflow - Discord Content Discovery',
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

export function Layout({ children }: { children: React.ReactNode }) {
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
			<body className={`${montserrat.variable} ${sourceSans3.variable}`}>
				{children}
			</body>
		</html>
	);
}
