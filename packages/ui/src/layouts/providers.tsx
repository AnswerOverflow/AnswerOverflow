'use client';
import { ThemeProvider } from 'next-themes';
import React, { Suspense } from 'react';
import {
	AnalyticsProvider,
	PostHogPageview,
} from '@answeroverflow/hooks/src/analytics/client';
import { TRPCProvider } from './trpc-provider';
import { trpc } from '../utils/client';
import { usePostHog } from 'posthog-js/react';

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
