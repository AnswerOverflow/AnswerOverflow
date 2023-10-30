'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import React, { useState } from 'react';
import { trpc } from '@answeroverflow/ui/src/utils/client';

import { transformer } from '@answeroverflow/api/transformer';

const getBaseUrl = () => {
	if (typeof window !== 'undefined') return ''; // browser should use relative url
	// eslint-disable-next-line n/no-process-env,turbo/no-undeclared-env-vars
	if (process.env.NEXT_PUBLIC_VERCEL_URL)
		// eslint-disable-next-line n/no-process-env,turbo/no-undeclared-env-vars
		return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`; // SSR should use vercel url
	// eslint-disable-next-line n/no-process-env,turbo/no-undeclared-env-vars
	return `http://localhost:${process.env.NEXT_PUBLIC_PORT ?? 3000}`; // dev SSR should use localhost
};
export default function TRPCProvider(props: { children?: React.ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());
	const [trpcClient] = useState(() =>
		trpc.createClient({
			transformer,
			links: [
				loggerLink({
					enabled: (opts) =>
						// eslint-disable-next-line n/no-process-env,turbo/no-undeclared-env-vars
						process.env.NEXT_PUBLIC_NODE_ENV === 'development' ||
						(opts.direction === 'down' && opts.result instanceof Error),
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
				{props.children}
			</QueryClientProvider>
		</trpc.Provider>
	);
}
