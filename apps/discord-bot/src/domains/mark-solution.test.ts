import {
	Client,
	TextChannel,
	ForumChannel,
	Guild,
	GuildMember,
	type AnyThreadChannel,
	Message,
	ButtonBuilder,
	type ButtonComponentData,
	ButtonStyle,
	type EmbedData,
} from 'discord.js';

import {
	checkIfCanMarkSolution,
	makeMarkSolutionResponse,
} from './mark-solution';
import {
	toAOChannel,
	toAOChannelWithServer,
	toAOMessage,
	toAOServer,
} from '~discord-bot/utils/conversions';

import type { ChannelWithFlags } from '@answeroverflow/db';
import { makeConsentButtonData } from './manage-account';
import {
	mockGuild,
	mockTextChannel,
	mockForumChannel,
	mockGuildMember,
	mockPublicThread,
	mockMessage,
	overrideVariables,
	mockReaction,
	testAllPermissions,
} from '@answeroverflow/discordjs-mock';
import { setupAnswerOverflowBot } from '~discord-bot/test/sapphire-mock';
import { randomSnowflake } from '@answeroverflow/discordjs-utils';
import {
	createChannel,
	createServer,
	ServerWithFlags,
	upsertMessage,
} from '@answeroverflow/db';
import { PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED } from '@answeroverflow/constants';

let client: Client;
let guild: Guild;
let defaultAuthor: GuildMember;
let textChannel: TextChannel;
let forumChannel: ForumChannel;
let textChannelThread: AnyThreadChannel;
let forumChannelThread: AnyThreadChannel;
let server: ServerWithFlags;
beforeEach(async () => {
	client = await setupAnswerOverflowBot();
	guild = mockGuild(client);
	textChannel = mockTextChannel(client, guild);
	forumChannel = mockForumChannel(client, guild);
	defaultAuthor = mockGuildMember({ client, guild });
	server = await createServer(toAOServer(guild));
	textChannelThread = mockPublicThread({
		client,
		parentChannel: textChannel,
	});
	forumChannelThread = mockPublicThread({
		client,
		parentChannel: forumChannel,
	});
});

describe('Can Mark Solution', () => {
	describe('Check If Can Mark Solution Failures - Preconditions', () => {
		it('should fail if the possible solution message is not in a thread', async () => {
			const message = mockMessage({
				client,
				channel: textChannel,
				author: defaultAuthor.user,
			});
			await expect(
				checkIfCanMarkSolution(message, defaultAuthor.user),
			).rejects.toThrowError(
				"Cannot mark a message as a solution if it's not in a thread",
			);
		});
		it('should fail if the possible solution message is from Answer Overflow Bot', async () => {
			const message = mockMessage({
				client,
				channel: textChannelThread,
				author: client.user!,
			});
			await expect(
				checkIfCanMarkSolution(message, defaultAuthor.user),
			).rejects.toThrowError(
				"Answer Overflow Bot messages can't be marked as a solution",
			);
		});
		it('should fail if the thread parent is not found', async () => {
			const message = mockMessage({
				client,
				channel: textChannelThread,
			});
			overrideVariables(textChannelThread, {
				parentId: randomSnowflake(),
			});
			await expect(
				checkIfCanMarkSolution(message, defaultAuthor.user),
			).rejects.toThrowError('Could not find the parent channel of the thread');
		});
		it('should fail if mark solution is not enabled in the channel', async () => {
			const message = mockMessage({
				client,
				channel: textChannelThread,
			});
			await createChannel({
				...toAOChannel(textChannel),
				flags: {
					markSolutionEnabled: false,
				},
				solutionTagId: 'solved',
			});
			await expect(
				checkIfCanMarkSolution(message, defaultAuthor.user),
			).rejects.toThrowError('Mark solution is not enabled in this channel');
		});
	});
	describe('Check If Can Mark Solution Failures - Mark Solution Enabled', () => {
		it('should fail if the question message is not found for a text channel thread', async () => {
			await createChannel({
				...toAOChannel(textChannel),
				flags: {
					markSolutionEnabled: true,
				},
			});
			mockMessage({
				client,
				channel: textChannel,
			});
			const solutionMessage = mockMessage({
				client,
				channel: textChannelThread,
			});
			await expect(
				checkIfCanMarkSolution(solutionMessage, defaultAuthor.user),
			).rejects.toThrowError('Could not find the root message of the thread');
		});
		it('should fail if the question message is not found for a forum channel thread', async () => {
			mockMessage({
				client,
				channel: forumChannelThread,
			});
			const solutionMessage = mockMessage({
				client,
				channel: forumChannelThread,
			});
			await createChannel({
				...toAOChannel(forumChannel),
				flags: {
					markSolutionEnabled: true,
				},
				solutionTagId: 'solved',
			});
			await expect(
				checkIfCanMarkSolution(solutionMessage, defaultAuthor.user),
			).rejects.toThrowError('Could not find the root message of the thread');
		});
		it('should fail if the user is not the question author and does not have override permissions', async () => {
			await createChannel({
				...toAOChannel(textChannel),
				flags: {
					markSolutionEnabled: true,
				},
			});
			mockMessage({
				client,
				channel: textChannel,
				override: {
					id: textChannelThread.id,
				},
			});
			const solutionMessage = mockMessage({
				client,
				channel: textChannelThread,
			});
			await expect(
				checkIfCanMarkSolution(solutionMessage, defaultAuthor.user),
			).rejects.toThrowError(
				`You don't have permission to mark this question as solved. Only the thread author or users with the permissions ${PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED.join(
					', ',
				)} can mark a question as solved.`,
			);
		});
	});
	describe('Check If Can Mark Solution Failures - Solved Indicator Applied Already', () => {
		it('should fail if the solution tag is already set', async () => {
			const threadWithSolvedTag = mockPublicThread({
				client,
				parentChannel: forumChannel,
				data: {
					applied_tags: ['solved'],
				},
			});
			mockMessage({
				client,
				channel: threadWithSolvedTag,
				author: defaultAuthor.user,
				override: {
					id: threadWithSolvedTag.id,
				},
			});
			const solutionMessage = mockMessage({
				client,
				channel: threadWithSolvedTag,
			});

			await createChannel({
				...toAOChannel(forumChannel),
				flags: {
					markSolutionEnabled: true,
				},
				solutionTagId: 'solved',
			});
			await expect(
				checkIfCanMarkSolution(solutionMessage, defaultAuthor.user),
			).rejects.toThrowError('This question is already marked as solved');
		});
		it('should fail if the solution emoji is already set', async () => {
			const rootMessage = mockMessage({
				client,
				channel: textChannel,
				author: defaultAuthor.user,
				override: {
					id: textChannelThread.id,
				},
			});

			const solutionMessage = mockMessage({
				client,
				channel: textChannelThread,
			});

			mockReaction({
				message: rootMessage,
				user: rootMessage.client.user,
				override: {
					emoji: {
						name: '✅',
						id: '✅',
					},
				},
			});
			await createChannel({
				...toAOChannel(textChannel),
				flags: {
					markSolutionEnabled: true,
				},
				solutionTagId: 'solved',
			});

			await expect(
				checkIfCanMarkSolution(solutionMessage, defaultAuthor.user),
			).rejects.toThrowError('This question is already marked as solved');
		});
		it('should fail if the question is already solved', async () => {
			const rootMessage = mockMessage({
				client,
				channel: textChannel,
				author: defaultAuthor.user,
				override: {
					id: textChannelThread.id,
				},
			});
			const solutionMessage = mockMessage({
				client,
				channel: textChannelThread,
			});
			const asAoMessage = await toAOMessage(rootMessage);
			await upsertMessage({
				...asAoMessage,
			});
			await upsertMessage({
				...(await toAOMessage(solutionMessage)),
				questionId: asAoMessage.id,
			});

			await createChannel({
				...toAOChannel(textChannel),
				flags: {
					markSolutionEnabled: true,
				},
				solutionTagId: 'solved',
			});

			await expect(
				checkIfCanMarkSolution(solutionMessage, defaultAuthor.user),
			).rejects.toThrowError('This question is already marked as solved');
		});
		it('should fail to mark a solution if the solution is the question', async () => {
			const rootMessage = mockMessage({
				client,
				channel: forumChannelThread,
				author: defaultAuthor.user,
				override: {
					id: forumChannelThread.id,
				},
			});
			mockMessage({
				client,
				channel: forumChannelThread,
			});
			await createChannel({
				...toAOChannel(forumChannel),
				flags: {
					markSolutionEnabled: true,
				},
				solutionTagId: 'solved',
			});
			await expect(
				checkIfCanMarkSolution(rootMessage, defaultAuthor.user),
			).rejects.toThrowError(
				'You cannot mark the question message as the solution, please select the message that best matches the solution.\n\nIf the solution is in the question message, please copy and paste it into a new message and mark that as the solution.',
			);
		});
	});
	describe('Check If Can Mark Solution Success', () => {
		let questionMessage: Message;
		let solutionMessage: Message;
		beforeEach(async () => {
			await createChannel({
				...toAOChannel(textChannel),
				flags: {
					markSolutionEnabled: true,
				},
				solutionTagId: 'solved',
			});

			questionMessage = mockMessage({
				client,
				channel: textChannel,
				override: {
					id: textChannelThread.id,
				},
				author: defaultAuthor.user,
			});
			solutionMessage = mockMessage({
				client,
				channel: textChannelThread,
			});
		});
		it('should pass if the user is the question author', async () => {
			const {
				question,
				solution,
				server,
				thread,
				parentChannel,
				channelSettings,
			} = await checkIfCanMarkSolution(solutionMessage, defaultAuthor.user);
			expect(question).toEqual(questionMessage);
			expect(solution).toEqual(solutionMessage);
			expect(server).toEqual(textChannel.guild);
			expect(thread).toEqual(textChannelThread);
			expect(parentChannel).toEqual(textChannel);
			expect(channelSettings.solutionTagId).toEqual('solved');
		});
		it('should pass if the user has administrator', async () => {
			await testAllPermissions({
				permissionsThatShouldWork: [
					'Administrator',
					'ManageChannels',
					'ManageThreads',
					'ManageGuild',
				],
				async operation(permission, isPermissionAllowed) {
					const solver = mockGuildMember({
						client,
						guild: textChannel.guild,
						permissions: permission,
					});
					let didError = false;
					try {
						const { question, solution } = await checkIfCanMarkSolution(
							solutionMessage,
							solver.user,
						);
						expect(question).toEqual(questionMessage);
						expect(solution).toEqual(solutionMessage);
					} catch (error) {
						didError = true;
					}
					expect(didError).toEqual(!isPermissionAllowed);
				},
			});
		});
	});
});

describe('Make Mark Solution Response', () => {
	let question: Message;
	let solution: Message;
	let settings: ChannelWithFlags;
	let jumpToSolutionButtonData: Partial<ButtonComponentData>;
	const solutionMessageWithoutConsentRequest =
		'**Thank you for marking this question as solved!**';
	let solutionMessageWithConsentRequest: string;
	let solutionEmbedData: Partial<EmbedData>;
	beforeEach(() => {
		question = mockMessage({
			client,
			channel: textChannel,
			override: {
				id: textChannelThread.id,
			},
		});
		solution = mockMessage({
			client,
			channel: textChannelThread,
		});
		settings = {
			...toAOChannelWithServer(textChannel),
			flags: {
				markSolutionEnabled: true,
				autoThreadEnabled: true,
				forumGuidelinesConsentEnabled: true,
				indexingEnabled: true,
				sendMarkSolutionInstructionsInNewThreads: true,
			},
			inviteCode: null,
			solutionTagId: 'solved',
			archivedTimestamp: null,
		};
		jumpToSolutionButtonData = new ButtonBuilder()
			.setLabel('Jump To Solution')
			.setURL(solution.url)
			.setStyle(ButtonStyle.Link).data;
		solutionMessageWithConsentRequest = [
			`**Thank you for marking this question as solved!**`,
			`Want to help others find the answer to this question? Use the button below to display your messages in ${guild.name} on the web!`,
		].join('\n\n');
		solutionEmbedData = {
			description: solutionMessageWithConsentRequest,
			color: 9228799,
			fields: [
				{
					name: 'Learn more',
					value: 'https://answeroverflow.com',
				},
			],
		} as EmbedData;
	});

	it('should make a response with a consent button and prompt in a channel with indexing enabled and forum guidelines consent disabled', () => {
		const { components, embed } = makeMarkSolutionResponse({
			question,
			solution,
			server,
			settings: {
				...settings,
				flags: {
					...settings.flags,
					indexingEnabled: true,
					forumGuidelinesConsentEnabled: false,
				},
			},
		});
		expect(components!.components.map((component) => component.data)).toEqual([
			makeConsentButtonData('mark-solution-response'),
			jumpToSolutionButtonData,
		]);
		expect(embed.data).toEqual(solutionEmbedData);
	});
	it('should make a response with only the solution response a channel with indexing enabled and forum guidelines consent enabled', () => {
		const { components, embed } = makeMarkSolutionResponse({
			question,
			solution,
			server,
			settings: {
				...settings,
				flags: {
					...settings.flags,
					indexingEnabled: true,
					forumGuidelinesConsentEnabled: true,
				},
			},
		});
		expect(components!.components.map((component) => component.data)).toEqual([
			jumpToSolutionButtonData,
		]);
		expect(embed.data).toEqual({
			...solutionEmbedData,
			description: solutionMessageWithoutConsentRequest,
		});
	});
});
