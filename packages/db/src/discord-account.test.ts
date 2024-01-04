import { findMessageById } from './message';
import {
	deleteDiscordAccount,
	upsertManyDiscordAccounts,
} from './discord-account';
import {
	mockChannel,
	mockDiscordAccount,
	mockMessage,
	mockServer,
} from '@answeroverflow/db-mock';
import { createServer } from './server';
import { createChannel } from './channel';
import { DiscordAccount } from './schema';
import { upsertMessage } from './message-node';
let account1: DiscordAccount;
let account2: DiscordAccount;
let account3: DiscordAccount;
beforeEach(() => {
	account1 = mockDiscordAccount();
	account2 = mockDiscordAccount();
	account3 = mockDiscordAccount();
});

describe('Discord Account Operations', () => {
	describe('Discord Account Upsert Many', () => {
		it('should create many discord accounts', async () => {
			await upsertManyDiscordAccounts([account1, account2, account3]);
		});
		it('should update many discord accounts', async () => {});
		it('should create and update many discord accounts', async () => {});
		it('should delete messages of a discord user on delete', async () => {
			const account = mockDiscordAccount();
			await upsertManyDiscordAccounts([account]);
			const srv = mockServer();
			const chnl = mockChannel(srv);
			const msg = mockMessage(srv, chnl, account);
			await createServer(srv);
			await createChannel(chnl);
			await upsertMessage(msg);
			await deleteDiscordAccount(account.id);
			const fetchedMsg = await findMessageById(msg.id);
			expect(fetchedMsg).not.toBeDefined();
		});
	});
});
