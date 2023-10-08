'use client';
import { ThemeProvider } from 'next-themes';
import { AnalyticsProvider } from '@answeroverflow/hooks/src/analytics';
import { Session } from 'next-auth';

export function Providers(props: {
	children: React.ReactNode;
	session: Session | undefined | null;
}) {
	return (
		<ThemeProvider attribute="class" defaultTheme={'dark'} enableSystem>
			{/*TODO: Analytics loading w/ session shouldn't block content loading*/}
			<AnalyticsProvider session={props.session}>
				{props.children}
			</AnalyticsProvider>
		</ThemeProvider>
	);
}
