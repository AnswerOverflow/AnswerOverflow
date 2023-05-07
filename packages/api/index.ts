export type { AppRouter } from './src/router';
export { appRouter as appRouter, botRouter as botRouter } from './src/router';

export {
	createContext as createContext,
	createBotContext as createBotContext,
} from '~api/router/context';
export type { Context, BotContextCreate } from '~api/router/context';

export * from './src/utils/types';
export * from './src/router/users/accounts/types';
export * from './src/router/server/types';
export * from './src/router/channel/types';
export * from './src/router/users/user/types';
export * from './src/router/user-server-settings/types';
