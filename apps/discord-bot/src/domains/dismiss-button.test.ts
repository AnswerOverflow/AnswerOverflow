import {
	type APIButtonComponentWithCustomId,
	ButtonStyle,
	Client,
	Guild,
	TextChannel,
} from 'discord.js';
import {
	DISMISS_OVERRIDE_PERMISSIONS,
	MISSING_PERMISSIONS_TO_DISMISS_ERROR_MESSAGE,
	dismissMessage,
	makeDismissButton,
	parseDismissButtonId,
} from './dismiss-button';
import {
	mockGuild,
	mockGuildMember,
	mockMessage,
	mockTextChannel,
} from '@answeroverflow/discordjs-mock';
import { setupAnswerOverflowBot } from '../../test/sapphire-mock';

describe('Dismiss Button', () => {
	describe('Interaction Parser', () => {
		it('should successfully get the user id from a dismiss button', () => {
			const customId = 'dismiss:123456789';
			const result = parseDismissButtonId(customId);
			expect(result).toEqual('123456789');
		});
		it('should throw an error if the custom id is not a dismiss button', () => {
			const customId = 'not-dismiss:123456789';
			expect(() => parseDismissButtonId(customId)).toThrowError(
				'Dismiss button interaction parse error: no-dismiss-prefix',
			);
		});
		it('should throw an error if the custom id does not have a dismisser id', () => {
			const customId = 'dismiss:';
			expect(() => parseDismissButtonId(customId)).toThrowError(
				'Dismiss button interaction parse error: no-dismisser-id',
			);
		});
	});
	describe('Make Dismiss Button', () => {
		it('should make a dismiss button', () => {
			const result = makeDismissButton('123456789');
			const data = result.data as APIButtonComponentWithCustomId;
			expect(data.custom_id).toEqual('dismiss:123456789');
			expect(data.label).toEqual('Dismiss');
			expect(data.style).toEqual(ButtonStyle.Secondary);
		});
	});
	describe('Dismiss Message', () => {
		let client: Client;
		let channel: TextChannel;
		let guild: Guild;
		beforeEach(async () => {
			client = await setupAnswerOverflowBot();
			guild = mockGuild(client);
			channel = mockTextChannel(client, guild);
		});
		it('should fail if the dismisser is not who the message replies to and does not have override permissions', async () => {
			const member = mockGuildMember({
				client,
				guild,
			});
			const message = mockMessage({
				client,
				channel,
			});
			await expect(
				dismissMessage({
					allowedToDismissId: '123456789',
					dismisser: member,
					messageToDismiss: message,
				}),
			).rejects.toThrowError(MISSING_PERMISSIONS_TO_DISMISS_ERROR_MESSAGE);
		});
		it('should succeed if the dismisser is who the message replies to', async () => {
			const member = mockGuildMember({
				client,
				guild,
			});
			const message = mockMessage({
				client,
				channel,
			});
			await expect(
				dismissMessage({
					allowedToDismissId: member.id,
					dismisser: member,
					messageToDismiss: message,
				}),
			).resolves.not.toThrow();
			const deletedMessage = channel.messages.cache.get(message.id);
			expect(deletedMessage).toBeUndefined();
		});
		it('should succeed if the dismisser has override permissions', async () => {
			const member = mockGuildMember({
				client,
				guild,
				permissions: DISMISS_OVERRIDE_PERMISSIONS,
			});
			const message = mockMessage({
				client,
				channel,
			});
			await expect(
				dismissMessage({
					allowedToDismissId: '123456789',
					dismisser: member,
					messageToDismiss: message,
				}),
			).resolves.not.toThrow();
			const deletedMessage = channel.messages.cache.get(message.id);
			expect(deletedMessage).toBeUndefined();
		});
	});
});
