import type { ReactRenderer } from '@storybook/react';
import type { Args, PartialStoryFn, StoryContext } from '@storybook/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { transformer } from '@answeroverflow/api/transformer';
import React, { useEffect, useState } from 'react';
import { trpc, StorybookTRPC } from './trpc';
import hljs from 'highlight.js';
import { toggleDarkTheme } from './theme';

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
				}}
			/>
		);
	}

	const { tailwindTheme } = context.globals as Globals;
	toggleDarkTheme(tailwindTheme === 'dark');
	const Dark = () => (
		// eslint-disable-next-line tailwindcss/no-custom-classname
		<Flex className="dark bg-ao-black">
			<Story />
		</Flex>
	);

	if (tailwindTheme === 'dark') {
		return <Dark />;
	}

	const Light = () => (
		<Flex className="bg-ao-white">
			<Story />
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
			<QueryClientProvider client={queryClient}>{Story()}</QueryClientProvider>
		</storybookTrpc.Provider>
	);
}

export function WithHighlightJS(Story: PartialStoryFn<ReactRenderer, Args>) {
	useEffect(() => {
		hljs.highlightAll();
	}, []);
	return <Story />;
}
