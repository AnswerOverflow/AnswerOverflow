import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { transformer } from '@answeroverflow/api/transformer';
import React, { useEffect, useState } from 'react';
import { trpc, type StorybookTRPC } from '../src/utils/trpc';
import { RouterContext } from 'next/dist/shared/lib/router-context';
import Router, { type NextRouter } from 'next/router';
import hljs from 'highlight.js';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import {
	AnalyticsContextProvider,
	TenantContextProvider,
} from '@answeroverflow/hooks';
import { mockServer } from '~ui/test/props';
import { useGlobalState, type GlobalState } from './global-state';
import { ModeState, action } from '@ladle/react';

const storybookTrpc = trpc as StorybookTRPC;

export const WithNextRouter = (props: { children: React.ReactNode }) => {
	const { Provider, ...parameters } = RouterContext;

	if (Provider === undefined)
		throw new Error(
			'NextContext.Provider is undefined, please add it to parameters.nextRouter.Provider',
		);

	Router.router = {
		locale: undefined,
		route: '/',
		pathname: '/',
		query: {},
		asPath: '/',
		push(...args: unknown[]) {
			action('nextRouter.push')(...args);
			return Promise.resolve(true);
		},
		replace(...args: unknown[]) {
			action('nextRouter.replace')(...args);
			return Promise.resolve(true);
		},
		reload(...args: unknown[]) {
			action('nextRouter.reload')(...args);
		},
		back(...args: unknown[]) {
			action('nextRouter.back')(...args);
		},
		prefetch(...args: unknown[]) {
			action('nextRouter.prefetch')(...args);
			return Promise.resolve();
		},
		beforePopState(...args: unknown[]) {
			action('nextRouter.beforePopState')(...args);
		},
		events: {
			on(...args: unknown[]) {
				action('nextRouter.events.on')(...args);
			},
			off(...args: unknown[]) {
				action('nextRouter.events.off')(...args);
			},
			emit(...args: unknown[]) {
				action('nextRouter.events.emit')(...args);
			},
		},
		isFallback: false,
		...parameters,
	} as unknown as typeof Router.router;

	return (
		<Provider value={Router.router as NextRouter}>{props.children}</Provider>
	);
};

export function WithTailwindTheme(props: { children: React.ReactNode }) {
	const { mode, theme } = useGlobalState();
	function Flex(props: any) {
		return (
			<div
				{...props}
				style={{
					flexDirection: 'center',
					padding: 0,
					backgroundImage:
						"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='199' viewBox='0 0 100 199'%3E%3Cg fill='%23bababa' fill-opacity='0.34'%3E%3Cpath d='M0 199V0h1v1.99L100 199h-1.12L1 4.22V199H0zM100 2h-.12l-1-2H100v2z'%3E%3C/path%3E%3C/g%3E%3C/svg%3E\")",
				}}
			/>
		);
	}

	const Dark = () => (
		<Flex className="dark bg-black">
			<ThemeProvider defaultTheme="dark" attribute="class">
				{props.children}
			</ThemeProvider>
		</Flex>
	);

	if (theme === 'dark') {
		return <Dark />;
	}

	const Light = () => (
		<Flex className="bg-ao-white">
			<ThemeProvider defaultTheme="light" attribute="class">
				{props.children}
			</ThemeProvider>
		</Flex>
	);

	if (theme === 'light') {
		return <Light />;
	}
	return (
		<div>
			<Dark />
			<Light />
		</div>
	);
}

export function WithAuth(props: {
	children: React.ReactNode;
	authState: 'signedIn' | 'signedOut';
}) {
	const { authState } = props;
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
					{props.children}
				</QueryClientProvider>
			</SessionProvider>
		</storybookTrpc.Provider>
	);
}

export function WithHighlightJS(props: { children: React.ReactNode }) {
	useEffect(() => {
		hljs.configure({
			ignoreUnescapedHTML: true,
		});
		hljs.highlightAll();
	}, []);
	return <>{props.children}</>;
}

export function WithAnalytics(props: { children: React.ReactNode }) {
	return (
		<AnalyticsContextProvider
			value={{
				loaded: true,
			}}
		>
			{props.children}
		</AnalyticsContextProvider>
	);
}

export function WithTenantSite(props: {
  children: React.ReactNode;
}) {
	const { isTenantSite } = {
    isTenantSite: 'false',
  }
	const server = isTenantSite === 'true' ? mockServer() : undefined;
	return (
		<TenantContextProvider value={server}>
			{props.children}
		</TenantContextProvider>
	);
}
