'use client';
import { ThemeProvider } from 'next-themes';
import React from 'react';

export function Providers(props: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme={'dark'} enableSystem>
			{props.children}
		</ThemeProvider>
	);
}
