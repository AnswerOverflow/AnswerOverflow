import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { BotRouter } from './index';
import superjson from 'superjson';
export const botClient = createTRPCProxyClient<BotRouter>({
	links: [
		httpBatchLink({
			url: 'http://localhost:2022/trpc',
		}),
	],
	transformer: superjson,
});
