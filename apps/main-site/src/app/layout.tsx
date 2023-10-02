import '../styles/globals.css';
import '../styles/code.scss';
import React from 'react';
import { Providers } from '../components/providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@answeroverflow/auth';
import Script from 'next/script';
import { CommitBanner } from '@answeroverflow/ui/src/components/dev/CommitBanner';
import { headers } from 'next/headers';
import { isOnMainSite } from '@answeroverflow/constants';
import { findServerByCustomDomain } from '@answeroverflow/db/src/server';
import { zServerPublic } from '@answeroverflow/db/src/zodSchemas/serverSchemas';
import { webClientEnv } from '@answeroverflow/env/web';

export default async function RootLayout({
	// Layouts must accept a children prop.
	// This will be populated with nested layouts or pages
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession(authOptions);
	const hostname = headers().get('host');
	if (!hostname) throw new Error('No hostname');
	const tenant = isOnMainSite(hostname)
		? undefined
		: zServerPublic.parse(await findServerByCustomDomain(hostname));

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
				<Providers session={undefined} tenant={tenant}>
					{children}
				</Providers>
				{session && (
					<h1>
						{session.user.name} {session.user.email}
					</h1>
				)}
				<CommitBanner />
				{/*<CommitBanner />*/}
			</body>
		</html>
	);
}
