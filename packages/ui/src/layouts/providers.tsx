'use client';
import { ThemeProvider } from 'next-themes';
import React from 'react';
import { AnalyticsProvider } from '@answeroverflow/hooks/src/analytics/client';
import { TRPCProvider } from './trpc-provider';

export function Providers(props: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme={'dark'} enableSystem>
			<AnalyticsProvider>
				<TRPCProvider>{props.children}</TRPCProvider>
			</AnalyticsProvider>
		</ThemeProvider>
	);
}
