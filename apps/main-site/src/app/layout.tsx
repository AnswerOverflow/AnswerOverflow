import '../styles/globals.css';
import '../styles/code.scss';
import { Providers } from './providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@answeroverflow/auth';
import Script from 'next/script';
import { CommitBanner } from '~ui/components/dev/CommitBanner';
import React from 'react';

export default async function RootLayout({
	// Layouts must accept a children prop.
	// This will be populated with nested layouts or pages
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession(authOptions);
	return (
		<html lang="en">
			<Script
				src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
			/>
			<Script id="google-analytics">
				{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
        `}
			</Script>
			<body>
				<Providers session={undefined}>{children}</Providers>
				{session && (
					<h1>
						{session.user.name} {session.user.email}
					</h1>
				)}
				<CommitBanner />
			</body>
		</html>
	);
}
