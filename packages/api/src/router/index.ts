import { router } from './trpc';
import { authRouter } from './auth';
import { channelRouter } from '~api/router/channel/channel';
import { serverRouter } from '~api/router/server/server';
import { discordAccountRouter } from './users/accounts/discord-accounts';
import { userServerSettingsRouter } from './user-server-settings/user-server-settings';
import { userRouter } from './users/user/user';
import { messagesRouter } from './messages/messages';

export const botRouter = router({
	// Discord:
	servers: serverRouter,
	channels: channelRouter,
	discordAccounts: discordAccountRouter,
	userServerSettings: userServerSettingsRouter,

	// Other:
	users: userRouter,
});

export const appRouter = router({
	servers: serverRouter,
	channels: channelRouter,
	discordAccounts: discordAccountRouter,
	userServerSettings: userServerSettingsRouter,
	messagePage: messagesRouter,

	// Other:
	users: userRouter,
	auth: authRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
