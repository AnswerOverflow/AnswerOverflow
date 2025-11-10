'use client';
import { ThemeProvider } from 'next-themes';
import React, { Suspense } from 'react';

import { ServerPublic } from '@answeroverflow/api/router/types';
import { TenantContext } from '../context/tenant-context';
import { AnalyticsProvider, PostHogPageview } from '../hooks/client';
import { usePostHog } from '../hooks/use-posthog';
import { trpc } from '../utils/client';
import { TRPCProvider } from './trpc-provider';

function IdentifyUser() {
	const { data } = trpc.auth.getSession.useQuery();
	const posthog = usePostHog();
	if (typeof window === 'undefined' || !data) return null;

	posthog.identify(data?.user.id);
	return null;
}

export function Providers(props: {
	children: React.ReactNode;
	tenant: ServerPublic | null;
}) {
	return (
		<TenantContext.Provider value={{ tenant: props.tenant }}>
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
		</TenantContext.Provider>
	);
}
