'use client';
import { ThemeProvider } from 'next-themes';
import React from 'react';
import { AnalyticsProvider } from '@answeroverflow/hooks/src/analytics/client';

export function Providers(props: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme={'dark'} enableSystem>
			<AnalyticsProvider>{props.children}</AnalyticsProvider>
		</ThemeProvider>
	);
}
