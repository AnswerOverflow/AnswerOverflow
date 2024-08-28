import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { BotRouter } from './index';
export const botClient = createTRPCProxyClient<BotRouter>({
	links: [
		httpBatchLink({
			url: 'http://localhost:2022/trpc',
		}),
	],
	transformer: superjson,
});
