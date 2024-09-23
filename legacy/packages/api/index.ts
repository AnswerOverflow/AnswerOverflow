export type { AppRouter } from './src/router';
export { appRouter as appRouter, botRouter as botRouter } from './src/router';

export {
	createContext as createContext,
	createBotContext as createBotContext,
} from './src/router/context';
export type { Context, BotContextCreate } from './src/router/context';

export * from './src/utils/types';
export * from './src/router/server/types';
export * from './src/router/user-server-settings/types';
export type { User } from '@answeroverflow/db';
export type {
	VercelDomainVerificationResponse,
	DomainVerificationStatusProps,
} from './src/utils/domains';
