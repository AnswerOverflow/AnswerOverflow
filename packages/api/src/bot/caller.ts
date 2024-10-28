import { sharedEnvs } from '@answeroverflow/env/shared';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { BotRouter } from './index';
export const botClient = createTRPCProxyClient<BotRouter>({
	links: [
		httpBatchLink({
			url: process.env.BOT_URL ?? 'http://localhost:2022/',
			headers: () => ({
				Authorization: `Bearer ${sharedEnvs.DISCORD_CLIENT_SECRET}`,
			}),
		}),
	],
	transformer: superjson,
});
