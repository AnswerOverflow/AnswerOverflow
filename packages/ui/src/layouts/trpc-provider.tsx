'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import React, { useState } from 'react';
import { trpc } from '../utils/client';

import { transformer } from '@answeroverflow/api/transformer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const getBaseUrl = () => {
	if (typeof window !== 'undefined') return ''; // browser should use relative url
	// eslint-disable-next-line n/no-process-env
	if (process.env.NEXT_PUBLIC_VERCEL_URL)
		// eslint-disable-next-line n/no-process-env
		return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`; // SSR should use vercel url
	// eslint-disable-next-line n/no-process-env
	return `http://localhost:${process.env.NEXT_PUBLIC_PORT ?? 3000}`; // dev SSR should use localhost
};

export function TRPCProvider(props: { children?: React.ReactNode } | null) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						cacheTime: 1000 * 60 * 60 * 24, // 24 hours
						refetchOnReconnect: false,
						refetchOnMount: false,
						refetchOnWindowFocus: false,
					},
				},
			}),
	);
	const [trpcClient] = useState(() =>
		trpc.createClient({
			transformer,
			links: [
				loggerLink({
					enabled: () =>
						// process.env.NODE_ENV === 'development' ||
						// (opts.direction === 'down' && opts.result instanceof Error),
						false,
				}),
				httpBatchLink({
					url: `${getBaseUrl()}/api/trpc`,
				}),
			],
		}),
	);
	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				<ToastContainer />
				{props && props.children}
			</QueryClientProvider>
		</trpc.Provider>
	);
}
