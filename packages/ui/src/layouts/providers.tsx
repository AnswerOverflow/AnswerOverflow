'use client';
import { ThemeProvider } from 'next-themes';
import React, { Suspense } from 'react';

import { usePostHog } from 'posthog-js/react';
import { AnalyticsProvider, PostHogPageview } from '../hooks/client';
import { trpc } from '../utils/client';
import { TRPCProvider } from './trpc-provider';

function IdentifyUser() {
	const { data } = trpc.auth.getSession.useQuery();
	const posthog = usePostHog();
	if (typeof window === 'undefined' || !data) return null;

	posthog.identify(data?.user.id);
	return null;
}

export function Providers(props: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme={'dark'} enableSystem>
			<AnalyticsProvider>
				<TRPCProvider>
					<Suspense>
						<PostHogPageview />
					</Suspense>
					<IdentifyUser />
					{props.children}
				</TRPCProvider>
			</AnalyticsProvider>
		</ThemeProvider>
	);
}
