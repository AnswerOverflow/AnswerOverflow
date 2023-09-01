import { prisma } from '@answeroverflow/prisma-types';
import { getRandomId } from '@answeroverflow/utils';
import { mockDiscordAccount } from '@answeroverflow/db-mock';
import { createDiscordAccount } from './discord-account';
import {
	_NOT_PROD_createOauthAccountEntry,
	findDiscordOauthByProviderAccountId,
} from './auth';
import { db } from '../index';
import { users } from './schema';
describe('Auth', () => {
	it('should find a linked discord account auth by id', async () => {
		// TODO: Check if this is okay (migrated from prisma -> drizzle)
		const discordUserId = getRandomId();

		const USER_ID = getRandomId();
		const USER_EMAIL = 'example@example.com';

		// const user = await prisma.user.create({
		// 	data: {},
		// });
		await db.insert(users).values({
			id: USER_ID,
			email: USER_EMAIL,
		});
		await createDiscordAccount(
			mockDiscordAccount({
				id: discordUserId,
			}),
		);
		const oauth = await _NOT_PROD_createOauthAccountEntry({
			discordUserId,
			userId: USER_ID,
		});
		const found = await findDiscordOauthByProviderAccountId(discordUserId);
		expect(found).toEqual(oauth);
	});
});
