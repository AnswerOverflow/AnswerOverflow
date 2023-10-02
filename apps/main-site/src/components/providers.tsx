'use client';
import { ThemeProvider } from 'next-themes';
import { AnalyticsProvider } from '@answeroverflow/hooks/src/analytics';
import { Session } from 'next-auth';
import { TenantContextProvider } from '@answeroverflow/hooks/src/tenant';
import { ServerPublic } from '~api/router/server/types';

export function Providers(props: {
	children: React.ReactNode;
	session: Session | undefined | null;
	tenant: ServerPublic | undefined;
}) {
	return (
		<ThemeProvider attribute="class" defaultTheme={'dark'} enableSystem>
			{/* TODO: Move session to server*/}
			<TenantContextProvider value={props.tenant}>
				<AnalyticsProvider session={props.session}>
					{props.children}
				</AnalyticsProvider>
			</TenantContextProvider>
		</ThemeProvider>
	);
}
