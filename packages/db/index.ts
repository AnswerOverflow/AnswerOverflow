export * from './src/server';
export * from './src/channel';
export * from './src/discord-account';
export * from './src/ignored-discord-account';
export * from './src/auth';
export * from './src/user-server-settings';
export * from './src/message';
export * from './src/utils';
export * from './src/utils/error';
export * from './src/utils/operations';
export * from '@answeroverflow/prisma-types';
export * from '@answeroverflow/elastic-types';
declare global {
	namespace NodeJS {
		interface ProcessEnv {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			readonly NEXT_PUBLIC_DEPLOYMENT_ENV:
				| ('local' | 'staging' | 'production')
				| undefined;
		}
	}
}

if (process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === undefined) {
	throw new Error(
		'NEXT_PUBLIC_DEPLOYMENT_ENV is not defined, you must explicitly set it to "local", "staging" or "production"',
	);
}
