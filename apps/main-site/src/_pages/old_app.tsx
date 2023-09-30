// src/pages/App.tsx
import 'core-js/actual';

import type { Session } from 'next-auth';
import type { AppType, NextWebVitalsMetric } from 'next/app';

import { TenantContextProvider } from '@answeroverflow/hooks';
import React from 'react';

import { MDXProvider } from '@mdx-js/react';
import { CommitBanner } from '@answeroverflow/ui/src/components/dev/CommitBanner';
import type { ServerPublic } from '@answeroverflow/api';
import { ToastContainer } from 'react-toastify';
import { event } from 'nextjs-google-analytics';

import { PageWrapper } from '@answeroverflow/ui/src/components/pages/PageWrapper';
import { NextTRPC, trpc } from '@answeroverflow/ui/src/utils/trpc';
import 'react-toastify/dist/ReactToastify.css';

// eslint-disable-next-line @typescript-eslint/naming-convention
const MyApp: AppType<{
	session: Session | null;
	tenant: ServerPublic | undefined;
}> = ({ Component, pageProps: { session, ...pageProps } }) => {
	return (
		<TenantContextProvider value={pageProps.tenant}>
			<PageWrapper
				disabledRoutes={[
					'/',
					'/c/[communityId]',
					'/onboarding',
					'/[domain]',
					'/dashboard',
					'/about',
					'/dashboard/[serverId]',
				]}
			>
				<Component {...pageProps} />
			</PageWrapper>
		</TenantContextProvider>
	);
};
export default (trpc as NextTRPC).withTRPC(MyApp);
