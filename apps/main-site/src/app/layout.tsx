import '../styles/globals.css';
import '../styles/code.scss';
import React from 'react';
import { Providers } from '../components/providers';
import Script from 'next/script';
import { CommitBanner } from '@answeroverflow/ui/src/components/dev/CommitBanner';
import { webClientEnv } from '@answeroverflow/env/web';
import { getTenantInfo } from '../utils/get-tenant-info';
import { getServerSession } from '@answeroverflow/auth';

export default async function RootLayout({
	// Layouts must accept a children prop.
	// This will be populated with nested layouts or pages
	children,
}: {
	children: React.ReactNode;
}) {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [_, session] = await Promise.all([getTenantInfo(), getServerSession()]);

	return (
		<html lang="en">
			<Script
				src={`https://www.googletagmanager.com/gtag/js?id=${webClientEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID!}`}
			/>
			<Script id="google-analytics">
				{`
			  window.dataLayer = window.dataLayer || [];
			  function gtag(){dataLayer.push(arguments);}
			  gtag('js', new Date());

			  gtag('config', '${webClientEnv.NEXT_PUBLIC_GA_MEASUREMENT_ID!}');
			`}
			</Script>
			<body>
				<Providers session={session}>{children}</Providers>
				<CommitBanner />
			</body>
		</html>
	);
}
