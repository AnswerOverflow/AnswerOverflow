import {
	AnalyticsProvider,
	TenantContextProvider,
} from '@answeroverflow/hooks';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { PageWrapper } from '~ui/components/pages/PageWrapper';
import { CommitBanner } from '~ui/components/dev/CommitBanner';
import { MDXProvider } from '@mdx-js/react';
import { ToastContainer } from 'react-toastify';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { GoogleAnalytics } from 'nextjs-google-analytics';
import React from 'react';
import { Session } from 'next-auth';
import { ServerPublic } from '~api/router/server/types';
import { components } from '../components';

export const Providers = (props: {
	session: Session | null;
	tenant: ServerPublic | undefined;
	children: React.FC<{
		session: Session | null;
		tenant: ServerPublic | undefined;
	}>;
}) => (
	<TenantContextProvider value={props.tenant}>
		<ThemeProvider attribute="class" defaultTheme={'dark'} enableSystem>
			<SessionProvider session={props.session}>
				<AnalyticsProvider>
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
						<CommitBanner />
						<MDXProvider components={components}>
							<props.children session={props.session} tenant={props.tenant} />
							<ToastContainer toastClassName="bg-background dark:bg-background text-primary dark:text-primary" />
						</MDXProvider>
					</PageWrapper>
					<ReactQueryDevtools initialIsOpen={false} />
				</AnalyticsProvider>
			</SessionProvider>
		</ThemeProvider>
		<GoogleAnalytics trackPageViews strategy={'lazyOnload'} />
	</TenantContextProvider>
);
