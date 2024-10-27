import { sharedEnvs } from '@answeroverflow/env/shared';
import { isNotNull } from 'drizzle-orm';
import { db } from './db';
import {
	dbAccounts,
	dbAttachments,
	dbChannels,
	dbDiscordAccounts,
	dbEmojis,
	dbIgnoredDiscordAccounts,
	dbMessages,
	dbReactions,
	dbServers,
	dbSessions,
	dbTenantSessions,
	dbUserServerSettings,
	dbUsers,
} from './schema';
export async function clearDatabase() {
	if (
		sharedEnvs.NEXT_PUBLIC_DEPLOYMENT_ENV !== 'local' &&
		sharedEnvs.NEXT_PUBLIC_DEPLOYMENT_ENV !== 'ci'
	) {
		throw new Error('clearDatabase can only be used in local environment');
	}

	console.log('Wiping MySQL database...');

	await db.delete(dbAttachments);
	await db.delete(dbEmojis);
	await db.delete(dbReactions);
	await db.delete(dbMessages);
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
	console.log('MySQL Database wiped successfully');
	// quit the process
	// eslint-disable-next-line n/no-process-exit
	process.exit(0);
}
