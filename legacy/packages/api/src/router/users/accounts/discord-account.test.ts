import {
	createDiscordAccount,
	createManyDiscordAccounts,
	deleteDiscordAccount,
	type DiscordAccount,
} from '@answeroverflow/db';
import { mockDiscordAccount } from '@answeroverflow/db-mock';
import { pick } from '@answeroverflow/utils';
import {
	COULD_NOT_FIND_ACCOUNT_ERROR_MESSAGE,
	discordAccountRouter,
} from './discord-accounts';
import { NOT_AUTHORIZED_MESSAGE } from '../../../utils/permissions';
import {
	testAllPublicAndPrivateDataVariants,
	mockAccountCallerCtx,
} from '../../../../test/utils';

let discordAccount: DiscordAccount;
let discordAccount2: DiscordAccount;
function pickPublicFields(discordAccount: DiscordAccount) {
	return pick(discordAccount, 'id', 'name', 'avatar');
}

beforeEach(() => {
	discordAccount = mockDiscordAccount();
	discordAccount2 = mockDiscordAccount();
});
describe('Discord Account Operations', () => {
	describe('Discord Account By Id', () => {
		beforeEach(async () => {
			await createDiscordAccount(discordAccount);
		});

		it('should test all variants of finding a discord account by id', async () => {
			await testAllPublicAndPrivateDataVariants({
				async fetch({ source }) {
					const { ctx } = await mockAccountCallerCtx(source);
					const router = discordAccountRouter.createCaller(ctx);
					const data = await router.byId(discordAccount.id);
					return {
						data,
						privateDataFormat: discordAccount,
						publicDataFormat: pickPublicFields(discordAccount),
					};
				},
			});
		});
	});
	describe('Discord Account By Id Many', () => {
		beforeEach(async () => {
			await createManyDiscordAccounts([discordAccount, discordAccount2]);
		});
		it('should test all variants of finding many discord accounts by id', async () => {
			await testAllPublicAndPrivateDataVariants({
				async fetch({ source }) {
					const { ctx } = await mockAccountCallerCtx(source);
					const router = discordAccountRouter.createCaller(ctx);
					const data = await router.byIdMany([
						discordAccount.id,
						discordAccount2.id,
					]);
					return {
						data,
						privateDataFormat: [discordAccount, discordAccount2],
						publicDataFormat: [
							pickPublicFields(discordAccount),
							pickPublicFields(discordAccount2),
						],
					};
				},
			});
		});
	});
	describe('Delete', () => {
		it('should succeed deleting a discord account that the user owns', async () => {
			await createDiscordAccount(discordAccount);
			const { ctx } = await mockAccountCallerCtx('discord-bot', discordAccount);
			const router = discordAccountRouter.createCaller(ctx);
			await router.delete(discordAccount.id);
			await expect(router.byId(discordAccount.id)).rejects.toThrow(
				COULD_NOT_FIND_ACCOUNT_ERROR_MESSAGE,
			);
		});
		it('should fail deleting a discord account that the user does not own', async () => {
			await createDiscordAccount(discordAccount);
			const { ctx } = await mockAccountCallerCtx(
				'discord-bot',
				discordAccount2,
			);
			const router = discordAccountRouter.createCaller(ctx);
			await expect(router.delete(discordAccount.id)).rejects.toThrow(
				NOT_AUTHORIZED_MESSAGE,
			);
		});
	});
	describe('Undelete', () => {
		it('should succeed undeleting a discord account that the user owns', async () => {
			await createDiscordAccount(discordAccount);
			const { ctx } = await mockAccountCallerCtx('discord-bot', discordAccount);
			const router = discordAccountRouter.createCaller(ctx);
			await router.delete(discordAccount.id);
			await router.undelete(discordAccount.id);
			const data = await router.checkIfIgnored(discordAccount.id);
			expect(data).toBeFalsy();
		});
		it('should fail undeleting a discord account that the user does not own', async () => {
			await createDiscordAccount(discordAccount);
			await deleteDiscordAccount(discordAccount.id);
			const { ctx } = await mockAccountCallerCtx(
				'discord-bot',
				discordAccount2,
			);
			const router = discordAccountRouter.createCaller(ctx);
			await expect(router.undelete(discordAccount.id)).rejects.toThrow(
				NOT_AUTHORIZED_MESSAGE,
			);
		});
	});
});
