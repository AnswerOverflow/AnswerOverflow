import {
	ActionRowBuilder,
	type AnyThreadChannel,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	DiscordAPIError,
	EmbedBuilder,
	Message,
	type MessageActionRowComponentBuilder,
	PermissionResolvable,
	User,
} from 'discord.js';
import type { ChannelWithFlags } from '@answeroverflow/db';
import { makeConsentButton } from './manage-account';
import {
	findChannelById,
	findFullMessageById,
	findServerById,
	ServerWithFlags,
	upsertMessage,
} from '@answeroverflow/db';
import {
	ANSWER_OVERFLOW_BLUE_HEX,
	PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED,
} from '@answeroverflow/constants';
import {
	trackDiscordEvent,
	QuestionSolvedProps,
	serverWithDiscordInfoToAnalyticsData,
	channelWithDiscordInfoToAnalyticsData,
	threadWithDiscordInfoToAnalyticsData,
	memberToAnalyticsUser,
	messageToAnalyticsMessage,
} from '../utils/analytics';
import { toAOMessage } from '../utils/conversions';
import { RootChannel } from '../utils/utils';
import { indexTextBasedChannel } from './indexing';

const markSolutionErrorReasons = [
	'NOT_IN_GUILD',
	'NOT_IN_THREAD',
	'ANSWER_OVERFLOW_BOT_MESSAGE',
	'COULD_NOT_FIND_PARENT_CHANNEL',
	'MARK_SOLUTION_NOT_ENABLED',
	'COULD_NOT_FIND_ROOT_MESSAGE',
	'QUESTION_CANNOT_BE_SOLUTION',
	'NO_PERMISSION',
	'ALREADY_SOLVED_VIA_EMBED',
	'ALREADY_SOLVED_VIA_TAG',
	'ALREADY_SOLVED_VIA_EMOJI',
] as const;

const PUBG_MOBILE_SERVER_ID = '393088095840370689';

export type MarkSolutionErrorReason = (typeof markSolutionErrorReasons)[number];
export class MarkSolutionError extends Error {
	constructor(
		public reason: MarkSolutionErrorReason,
		public override message: string,
	) {
		super(message);
	}
}

export async function checkIfCanMarkSolution(
	possibleSolution: Message,
	userMarkingAsSolved: User,
	isChangingSolution: boolean = false,
) {
	const guild = possibleSolution.guild;
	if (!guild)
		throw new MarkSolutionError(
			'NOT_IN_GUILD',
			'Cannot mark a message as a solution if it is not in a guild',
		);
	const thread = possibleSolution.channel;

	if (!thread.isThread()) {
		throw new MarkSolutionError(
			'NOT_IN_THREAD',
			"Cannot mark a message as a solution if it's not in a thread",
		);
	}
	const threadParent = thread.parent;

	if (possibleSolution.author.id === possibleSolution.client.id) {
		throw new MarkSolutionError(
			'ANSWER_OVERFLOW_BOT_MESSAGE',
			"Answer Overflow Bot messages can't be marked as a solution",
		);
	}

	if (!threadParent)
		throw new MarkSolutionError(
			'COULD_NOT_FIND_PARENT_CHANNEL',
			'Could not find the parent channel of the thread',
		);

	const channelSettings = await findChannelById(threadParent.id);

	if (!channelSettings || !channelSettings.flags.markSolutionEnabled) {
		throw new MarkSolutionError(
			'MARK_SOLUTION_NOT_ENABLED',
			'Mark solution is not enabled in this channel',
		);
	}

	// Find the question message
	// First try to find the message that started the thread, threads are created with the same thread id as the starter message

	let questionMessage: Message | undefined;
	try {
		// TODO: Support headless threads
		if (threadParent.type === ChannelType.GuildForum) {
			// If we fail to find the message with the same id as the thread, fetch the first message in the thread as a fallback
			questionMessage = await thread.messages.fetch(thread.id);
		} else {
			questionMessage = await threadParent.messages.fetch(thread.id);
		}
	} catch (error) {
		if (error instanceof DiscordAPIError && error.status === 404) {
			throw new MarkSolutionError(
				'COULD_NOT_FIND_ROOT_MESSAGE',
				'Could not find the root message of the thread',
			);
		} else {
			throw error;
		}
	}

	if (questionMessage.id === possibleSolution.id) {
		throw new MarkSolutionError(
			'QUESTION_CANNOT_BE_SOLUTION',
			'You cannot mark the question message as the solution, please select the message that best matches the solution.\n\nIf the solution is in the question message, please copy and paste it into a new message and mark that as the solution.',
		);
	}
	// Check if the user has permission to mark the question as solved
	const guildMember = await guild.members.fetch(userMarkingAsSolved.id);
	if (questionMessage.author.id !== userMarkingAsSolved.id) {
		const doesUserHavePerms = PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED.some(
			(permission) =>
				threadParent
					.permissionsFor(guildMember)
					?.has(permission as PermissionResolvable),
		);

		// temp code for valorant server
		const roleIdAllowedToMarkAsSolved = '684140826762149923';
		const isUserInRole = guildMember.roles.cache.has(
			roleIdAllowedToMarkAsSolved,
		);

		if (!doesUserHavePerms && !isUserInRole) {
			throw new MarkSolutionError(
				'NO_PERMISSION',
				`You don't have permission to mark this question as solved. Only the thread author or users with the permissions ${PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED.join(
					', ',
				)} can mark a question as solved.`,
			);
		}
	}

	if (!isChangingSolution) {
		// Check if the question is already solved
		await assertMessageIsUnsolved(
			thread,
			questionMessage,
			channelSettings.solutionTagId,
		);
	}
	return {
		question: questionMessage,
		solution: possibleSolution,
		server: guild,
		thread,
		parentChannel: threadParent,
		channelSettings,
	};
}

export async function assertMessageIsUnsolved(
	thread: AnyThreadChannel,
	questionMessage: Message,
	solutionTagId: string | null,
) {
	// 1. Check if the thread has a solved tag
	if (solutionTagId && thread.appliedTags.includes(solutionTagId)) {
		throw new MarkSolutionError(
			'ALREADY_SOLVED_VIA_TAG',
			'This question is already marked as solved',
		);
	}

	// 2. Check if the thread has a solved emoji ✅ applied by the Answer Overflow Bot
	const checkmarkEmojis = questionMessage.reactions.cache.get('✅');
	if (checkmarkEmojis?.users.cache.has(questionMessage.client.user?.id)) {
		throw new MarkSolutionError(
			'ALREADY_SOLVED_VIA_EMOJI',
			'This question is already marked as solved',
		);
	}

	// 3. Look at the message history to see if it contains the solution message from the Answer Overflow Bot

	// This is more of a backup, so we only do the cached values
	const existingMessage = await findFullMessageById(questionMessage.id);

	const isAlreadySolved = existingMessage
		? existingMessage.solutions.length > 0
		: false;

	if (isAlreadySolved) {
		throw new MarkSolutionError(
			'ALREADY_SOLVED_VIA_EMBED',
			'This question is already marked as solved',
		);
	}
}

export async function addSolvedIndicatorToThread(
	thread: AnyThreadChannel,
	parentChannel: RootChannel,
	questionMessage: Message,
	solvedTagId: string | null,
) {
	// special override for PUBG Mobile server
	if (thread.guildId === PUBG_MOBILE_SERVER_ID && solvedTagId) {
		await thread.setAppliedTags(
			[solvedTagId],
			'Question Solved, clearing all existing tags & setting solved tag.',
		);
		return;
	}
	// Apply the solved tag if it exists and it is a forum channel, otherwise add a checkmark reaction as a fallback
	if (
		parentChannel.type == ChannelType.GuildForum &&
		solvedTagId &&
		// The maximum number of tags is 5, use the fallback if we have reached the limit
		thread.appliedTags.length < 5
	) {
		await thread.setAppliedTags([...thread.appliedTags, solvedTagId]);
	} else {
		await questionMessage.react('✅');
	}
}

export function makeRequestForConsentString(serverName: string) {
	return [
		`${serverName} uses Answer Overflow to publicly index questions on search engines such as Google so that people who have similar questions can find the answers they are looking for`,
		`Your permission is required to use your messages, if you would like to contribute your messages from ${serverName} help channels, please use the button below`,
	].join('\n\n');
}

export function makeMarkSolutionResponse({
	solution,
	server,
	settings,
}: {
	question: Message;
	solution: Message;
	server: ServerWithFlags;
	settings: ChannelWithFlags;
}) {
	const components = new ActionRowBuilder<MessageActionRowComponentBuilder>();
	const embed = new EmbedBuilder()
		.addFields(
			server.customDomain
				? []
				: [
						{
							name: 'Learn more',
							value: 'https://answeroverflow.com',
						},
					],
		)
		.setColor(ANSWER_OVERFLOW_BLUE_HEX);

	if (
		settings.flags.indexingEnabled &&
		!settings.flags.forumGuidelinesConsentEnabled &&
		!server.flags.considerAllMessagesPublic
	) {
		embed.setDescription(
			[
				`**Thank you for marking this question as solved!**`,
				`Want to help others find the answer to this question? Use the button below to display your messages in ${server.name} on the web!`,
			].join('\n\n'),
		);
		components.addComponents(makeConsentButton('mark-solution-response'));
	} else {
		embed.setDescription('**Thank you for marking this question as solved!**');
	}

	components.addComponents(
		new ButtonBuilder()
			.setLabel('Jump To Solution')
			.setURL(solution.url)
			.setStyle(ButtonStyle.Link),
	);

	// TODO: Add view on Answer Overflow

	return {
		embed,
		components: components.components.length > 0 ? components : undefined,
	};
}

export async function markAsSolved(targetMessage: Message, user: User) {
	const { parentChannel, question, solution, thread, channelSettings, server } =
		await checkIfCanMarkSolution(targetMessage, user);
	const aoServer = await findServerById(server.id);
	// TODO: This sucks having here but we don't want to block while waiting to index
	const nonBlockingUpdates = async () => {
		await addSolvedIndicatorToThread(
			thread,
			parentChannel,
			question,
			channelSettings.solutionTagId,
		);
		await indexTextBasedChannel(thread);

		// TODO: This bottom part is a bit redundant but we want to make sure both exist in db
		await upsertMessage(await toAOMessage(question));
		await upsertMessage({
			...(await toAOMessage(solution)),
			questionId: question.id,
		});
		trackDiscordEvent('Solved Question', async () => {
			const [asker, solver, commandUser] = await Promise.all([
				thread.guild.members.fetch(question.author.id),
				thread.guild.members.fetch(solution.author.id),
				thread.guild.members.fetch(user.id),
			]);
			const data: QuestionSolvedProps = {
				...serverWithDiscordInfoToAnalyticsData({
					guild: thread.guild,
					serverWithSettings: aoServer!,
				}),
				...channelWithDiscordInfoToAnalyticsData({
					answerOverflowChannel: channelSettings,
					discordChannel: parentChannel,
				}),
				...threadWithDiscordInfoToAnalyticsData({
					thread,
				}),
				...memberToAnalyticsUser('Mark As Solver', commandUser),
				...memberToAnalyticsUser('Question Asker', asker),
				...memberToAnalyticsUser('Question Solver', solver),
				...messageToAnalyticsMessage('Question', question),
				...messageToAnalyticsMessage('Solution', solution),
				'Time To Solve In Ms':
					solution.createdTimestamp - question.createdTimestamp,
			};
			return {
				...data,
				'Answer Overflow Account Id': solver.id,
			};
		});
		try {
			await solution.react('✅');
		} catch {
			console.log('Could not react to solution message');
		}
		// wait 5 minutes then set the thread to archived
		// TODO: Move this to a remote queue so it survives restarts
		setTimeout(
			() => {
				if (
					thread?.permissionsFor(thread.client.id!)?.has('ManageThreads') &&
					thread.guildId !== PUBG_MOBILE_SERVER_ID
				) {
					void thread.setArchived(true);
				} else {
					console.log('Could not archive thread, missing permissions');
				}
			},
			5 * 60 * 1000,
		);
	};
	void nonBlockingUpdates();
	const { embed, components } = makeMarkSolutionResponse({
		question,
		solution,
		server: aoServer!,
		settings: channelSettings,
	});
	return {
		embed,
		components,
		solution,
		question,
		thread,
	};
}
