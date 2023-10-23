'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import React, { useState } from 'react';
import { trpc } from '@answeroverflow/ui/src/utils/client';

import { transformer } from '@answeroverflow/api/transformer';
import { webClientEnv } from '@answeroverflow/env/web';

const getBaseUrl = () => {
	if (typeof window !== 'undefined') return ''; // browser should use relative url
	if (webClientEnv.NEXT_PUBLIC_VERCEL_URL)
		return `https://${webClientEnv.NEXT_PUBLIC_VERCEL_URL}`; // SSR should use vercel url
	return `http://localhost:${webClientEnv.NEXT_PUBLIC_PORT ?? 3000}`; // dev SSR should use localhost
};
export default function TRPCProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [queryClient] = useState(() => new QueryClient());
	const [trpcClient] = useState(() =>
		trpc.createClient({
			transformer,
			links: [
				loggerLink({
					enabled: (opts) =>
						webClientEnv.NEXT_PUBLIC_NODE_ENV === 'development' ||
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
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	);
}
