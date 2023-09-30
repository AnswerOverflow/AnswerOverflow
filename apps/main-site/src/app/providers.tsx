'use client';
import { ThemeProvider } from 'next-themes';
import { AnalyticsProvider } from '@answeroverflow/hooks';
import { Session } from 'next-auth';

export function Providers(props: {
	children: React.ReactNode;
	session: Session | undefined | null;
}) {
	return (
		<ThemeProvider attribute="class" defaultTheme={'dark'} enableSystem>
			{/* TODO: Move session to server*/}
			<AnalyticsProvider session={props.session}>
				{props.children}
			</AnalyticsProvider>
		</ThemeProvider>
	);
}
