export * from '@prisma/client';
export { prisma } from './src/prisma';
export * from './src/bitfield';
export * from './src/zod-utils';
export * from './src/default';
export * from './src/server-schema';
export * from './src/channel-schema';
export * from './src/discord-account-schema';
export * from './src/user-server-settings-schema';
declare global {
	namespace NodeJS {
		interface ProcessEnv {
			/* Prisma */
			// eslint-disable-next-line @typescript-eslint/naming-convention
			DATABASE_URL: string;
			// eslint-disable-next-line @typescript-eslint/naming-convention
			ENVIRONMENT: 'discord-bot' | 'main-site';
			// common
			// eslint-disable-next-line @typescript-eslint/naming-convention
			readonly NODE_ENV: 'development' | 'production' | 'test';
		}
	}
}
