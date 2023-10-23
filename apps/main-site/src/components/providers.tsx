'use client';
import { ThemeProvider } from 'next-themes';
import { AnalyticsProvider } from '@answeroverflow/hooks/src/analytics/client';
import { Session } from 'next-auth';
import { Next13ProgressBar } from 'next13-progressbar';

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
			<Next13ProgressBar
				height="1.5px"
				color="#0094ff"
				options={{ trickle: true, trickleSpeed: 50, showSpinner: false }}
				showOnShallow
				delay={100}
			/>
		</ThemeProvider>
	);
}
