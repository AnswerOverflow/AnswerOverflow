import '../styles/globals.css';
import '../styles/code.scss';
import React from 'react';
import { Providers } from '../components/providers';
import Script from 'next/script';
import { CommitBanner } from '@answeroverflow/ui/src/components/dev/CommitBanner';
import { webClientEnv } from '@answeroverflow/env/web';
import { getTenantInfo } from '../utils/get-tenant-info';
import { getServerSession } from '@answeroverflow/auth';
import { DATA_UNBLOCKER } from '../utils/data-unblocker';

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
		// suppressHydrationWarning makes next themes doesn't error, other hydration errors are still shown
		<html lang="en" suppressHydrationWarning>
			<body>
				<Providers session={session}>{children}</Providers>
				<CommitBanner />
				<Script
					id="google-tag-manager"
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
				<Script
					id="data-unblocker"
					dangerouslySetInnerHTML={{
						__html: Buffer.from(DATA_UNBLOCKER, 'base64').toString(),
					}}
				/>
			</body>
		</html>
	);
}
