/* eslint-disable @typescript-eslint/naming-convention */
export { authOptions as authOptions } from './src/auth-options';
export { getServerSession as getServerSession } from './src/get-session';
export type { Session } from '@answeroverflow/next-auth';
import type { DefaultSession } from '@answeroverflow/next-auth';

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			/* Discord Oauth */
			DISCORD_CLIENT_ID: string;
			DISCORD_CLIENT_SECRET: string;
		}
	}
}

declare module '@answeroverflow/next-auth' {
	interface Session extends DefaultSession {
		user: {
			id: string;
		} & DefaultSession['user'];
	}
}
