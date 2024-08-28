import { router } from './trpc';
import { authRouter } from './auth';
import { channelRouter } from './channel/channel';
import { serverRouter } from './server/server';
import { discordAccountRouter } from './users/accounts/discord-accounts';
import { userServerSettingsRouter } from './user-server-settings/user-server-settings';
import { messagesRouter } from './messages/messages';
import { dashboardRouter } from './dashboard';

export const appRouter = router({
	servers: serverRouter,
	channels: channelRouter,
	discordAccounts: discordAccountRouter,
	userServerSettings: userServerSettingsRouter,
	messages: messagesRouter,
	dashboard: dashboardRouter,

	// Other:
	auth: authRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
