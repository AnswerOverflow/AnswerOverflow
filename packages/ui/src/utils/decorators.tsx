import type { ReactRenderer } from '@storybook/react';
import type { Args, PartialStoryFn, StoryContext } from '@storybook/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { transformer } from '@answeroverflow/api/transformer';
import React, { useEffect, useState } from 'react';
import { trpc, type StorybookTRPC } from './trpc';
import hljs from 'highlight.js';
import { ThemeProvider } from './theme';
import { SessionProvider } from 'next-auth/react';
import { AnalyticsContextProvider } from '@answeroverflow/hooks';
const storybookTrpc = trpc as StorybookTRPC;
type Globals = {
	tailwindTheme: 'dark' | 'light' | 'both';
	authState: 'signedIn' | 'signedOut';
};

export function WithTailwindTheme(
	Story: PartialStoryFn<ReactRenderer, Args>,
	context: StoryContext<ReactRenderer, Args>,
) {
	function Flex(props: any) {
		return (
			<div
				{...props}
				style={{
					flexDirection: 'center',
					padding:
						context.parameters.layout === 'fullscreen' ? 0 : '2rem 0 2rem',
					backgroundImage:
						"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='199' viewBox='0 0 100 199'%3E%3Cg fill='%23bababa' fill-opacity='0.34'%3E%3Cpath d='M0 199V0h1v1.99L100 199h-1.12L1 4.22V199H0zM100 2h-.12l-1-2H100v2z'%3E%3C/path%3E%3C/g%3E%3C/svg%3E\")",
				}}
			/>
		);
	}

	const { tailwindTheme } = context.globals as Globals;
	const Dark = () => (
		<Flex className="dark bg-black">
			<ThemeProvider defaultTheme="dark">
				<Story />
			</ThemeProvider>
		</Flex>
	);

	if (tailwindTheme === 'dark') {
		return <Dark />;
	}

	const Light = () => (
		<Flex className="bg-ao-white">
			<ThemeProvider defaultTheme="light">
				<Story />
			</ThemeProvider>
		</Flex>
	);

	if (tailwindTheme === 'light') {
		return <Light />;
	}
	return (
		<div>
			<Dark />
			<Light />
		</div>
	);
}

export function WithAuth(
	Story: PartialStoryFn<ReactRenderer, Args>,
	context: StoryContext<ReactRenderer, Args>,
) {
	const { authState } = context.globals as Globals;
	const [queryClient] = useState(() => new QueryClient());
	const [trpcClient, setTRPCClient] = useState(
		storybookTrpc.createClient({
			links: [
				httpBatchLink({
					url: 'http://localhost:3000/api/trpc',
					fetch(url, options) {
						return fetch(url, {
							...options,
							credentials: 'include',
						});
					},
				}),
			],
			transformer,
		}),
	);
	useEffect(() => {
		queryClient.clear();
		const trpcClient = storybookTrpc.createClient({
			links: [
				httpBatchLink({
					url: 'http://localhost:3000/api/trpc',
					fetch(url, options) {
						return fetch(url, {
							...options,
							credentials: authState === 'signedIn' ? 'include' : 'omit',
						});
					},
				}),
			],
			transformer,
		});
		setTRPCClient(trpcClient);
	}, [authState, setTRPCClient, queryClient]);
	return (
		<storybookTrpc.Provider client={trpcClient} queryClient={queryClient}>
			<SessionProvider session={null}>
				<QueryClientProvider client={queryClient}>
					{Story()}
				</QueryClientProvider>
			</SessionProvider>
		</storybookTrpc.Provider>
	);
}

export function WithHighlightJS(Story: PartialStoryFn<ReactRenderer, Args>) {
	useEffect(() => {
		hljs.configure({
			ignoreUnescapedHTML: true,
		});
		hljs.highlightAll();
	}, []);
	return <Story />;
}

export function WithAnalytics(Story: PartialStoryFn<ReactRenderer, Args>) {
	return (
		<AnalyticsContextProvider
			value={{
				loaded: true,
			}}
		>
			<Story />
		</AnalyticsContextProvider>
	);
}
