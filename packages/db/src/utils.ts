import { elastic } from '@answeroverflow/elastic-types';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { db } from '../index';
import {
	accounts,
	channels,
	discordAccounts,
	ignoredDiscordAccounts,
	servers,
	sessions,
	tenantSessions,
	users,
	userServerSettings,
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

	await db.delete(userServerSettings);
	await db.delete(channels).where(isNotNull(channels.parentId));
	await db.delete(tenantSessions);
	await db.delete(channels);
	await db.delete(servers);
	await db.delete(accounts);
	await db.delete(discordAccounts);
	await db.delete(sessions);
	await db.delete(users);
	await db.delete(ignoredDiscordAccounts);
	await elastic.createMessagesIndex();
	console.log('Database wiped successfully');
}
