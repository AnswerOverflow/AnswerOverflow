import { authRouter } from './auth';
import { channelRouter } from './channel';
import { dashboardRouter } from './dashboard';
import { discordAccountRouter } from './discord-accounts';
import { messagesRouter } from './messages';
import { serverRouter } from './server';
import { router } from './trpc';
import { userServerSettingsRouter } from './user-server-settings';

// TODO: just have one router
export const botRouter = router({
	// Discord:
	servers: serverRouter,
	channels: channelRouter,
	discordAccounts: discordAccountRouter,
	userServerSettings: userServerSettingsRouter,
});
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
