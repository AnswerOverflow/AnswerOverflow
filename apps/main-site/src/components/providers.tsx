'use client';
import { ThemeProvider } from 'next-themes';
import { Next13ProgressBar } from 'next13-progressbar';
import React from 'react';

export function Providers(props: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme={'dark'} enableSystem>
			{props.children}
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
