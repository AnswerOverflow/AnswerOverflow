import { elastic } from '@answeroverflow/elastic-types';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { db } from './db';
import {
	dbAccounts,
	dbChannels,
	dbDiscordAccounts,
	dbIgnoredDiscordAccounts,
	dbServers,
	dbSessions,
	dbTenantSessions,
	dbUsers,
	dbUserServerSettings,
} from './schema';
import { isNotNull } from 'drizzle-orm';
export async function clearDatabase() {
	if (sharedEnvs.NODE_ENV !== 'test') {
		throw new Error('clearDatabase can only be used in test environment');
	}

	if (
		sharedEnvs.NEXT_PUBLIC_DEPLOYMENT_ENV !== 'local' &&
		sharedEnvs.NEXT_PUBLIC_DEPLOYMENT_ENV !== 'ci'
	) {
		throw new Error('clearDatabase can only be used in local environment');
	}

	console.log('Wiping database...');

	await db.delete(dbUserServerSettings);
	await db.delete(dbChannels).where(isNotNull(dbChannels.parentId));
	await db.delete(dbTenantSessions);
	await db.delete(dbChannels);
	await db.delete(dbServers);
	await db.delete(dbAccounts);
	await db.delete(dbDiscordAccounts);
	await db.delete(dbSessions);
	await db.delete(dbUsers);
	await db.delete(dbIgnoredDiscordAccounts);
	await elastic.createMessagesIndex();
	console.log('Database wiped successfully');
	// quit the process
	// eslint-disable-next-line n/no-process-exit
	process.exit(0);
}
