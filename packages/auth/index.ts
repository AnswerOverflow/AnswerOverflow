/* eslint-disable @typescript-eslint/naming-convention */
export { authOptions as authOptions } from './src/auth-options';
export { getServerSession as getServerSession } from './src/get-session';
export type { Session } from 'next-auth';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
	interface Session extends DefaultSession {
		user: {
			id: string;
		} & DefaultSession['user'];
		isTenantSession: boolean;
	}
}

export * from './src/tenant-cookie';
