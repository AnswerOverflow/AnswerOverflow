import { getRandomId } from '@answeroverflow/utils';
import { mockDiscordAccount } from '@answeroverflow/db-mock';
import { createDiscordAccount } from './discord-account';
import {
	_NOT_PROD_createOauthAccountEntry,
	findDiscordOauthByProviderAccountId,
} from './auth';
import { db } from './db';
import { users } from './schema';
describe('Auth', () => {
	it('should find a linked discord account auth by id', async () => {
		const discordUserId = getRandomId();

		const USER_ID = getRandomId();
		const USER_EMAIL = `example+${getRandomId()}@example.com`;

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
