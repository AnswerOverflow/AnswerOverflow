import { authRouter } from './auth';
import { channelRouter } from './channel';
import { dashboardRouter } from './dashboard';
import { discordAccountRouter } from './discord-accounts';
import { messagesRouter } from './messages';
import { serverRouter } from './server';
import { router } from './trpc';
import { userServerSettingsRouter } from './user-server-settings';

export const appRouter = router({
	servers: serverRouter,
	channels: channelRouter,
	discordAccounts: discordAccountRouter,
	userServerSettings: userServerSettingsRouter,
	messages: messagesRouter,
	dashboard: dashboardRouter,
	auth: authRouter,
}); // if you clicked on go definition and ended up here, just go to the procedure from here
// since we build the .d.ts file it breaks go to definition

// export type definition of API
export type AppRouter = typeof appRouter;
