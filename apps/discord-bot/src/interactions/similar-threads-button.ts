import { Database } from "@packages/database/database";
import type { ButtonInteraction, GuildMember } from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type MessageActionRowComponentBuilder,
	MessageFlags,
} from "discord.js";
import { Console, Data, Effect, Layer, Metric } from "effect";
import {
	handleFeedbackModalSubmit,
	SIMILAR_THREADS_FEEDBACK_CONFIG,
	showFeedbackModal,
} from "../commands/feedback";
import { Discord } from "../core/discord-service";
import { eventsProcessed } from "../metrics";
import {
	trackSimilarThreadSolvedClicked,
	trackSimilarThreadsButtonClicked,
} from "../utils/analytics";
import {
	SIMILAR_THREAD_SOLVED_ACTION_PREFIX,
	SIMILAR_THREADS_ACTION_PREFIX,
} from "../utils/discord-components";
import { catchAllWithReport } from "../utils/error-reporting";

export enum SimilarThreadsErrorCode {
	INVALID_FORMAT = "INVALID_FORMAT",
	NOT_IN_GUILD = "NOT_IN_GUILD",
	THREAD_NOT_FOUND = "THREAD_NOT_FOUND",
}

export class SimilarThreadsError extends Data.TaggedError(
	"SimilarThreadsError",
)<{
	message: string;
	code: SimilarThreadsErrorCode;
}> {}

function parseSimilarThreadsButtonId(
	customId: string,
): Effect.Effect<{ threadId: string; serverId: string }, SimilarThreadsError> {
	return Effect.gen(function* () {
		const parts = customId.split(":");
		if (parts.length !== 3 || parts[0] !== SIMILAR_THREADS_ACTION_PREFIX) {
			return yield* Effect.fail(
				new SimilarThreadsError({
					message: "Invalid similar threads button format",
					code: SimilarThreadsErrorCode.INVALID_FORMAT,
				}),
			);
		}
		const threadId = parts[1];
		const serverId = parts[2];
		if (!threadId || !serverId) {
			return yield* Effect.fail(
				new SimilarThreadsError({
					message: "Missing thread ID or server ID in button customId",
					code: SimilarThreadsErrorCode.INVALID_FORMAT,
				}),
			);
		}
		return { threadId, serverId };
	});
}

function parseSimilarThreadSolvedButtonId(
	customId: string,
): Effect.Effect<
	{ sourceThreadId: string; similarThreadId: string; serverId: string },
	SimilarThreadsError
> {
	return Effect.gen(function* () {
		const parts = customId.split(":");
		if (
			parts.length !== 4 ||
			parts[0] !== SIMILAR_THREAD_SOLVED_ACTION_PREFIX
		) {
			return yield* Effect.fail(
				new SimilarThreadsError({
					message: "Invalid similar thread solved button format",
					code: SimilarThreadsErrorCode.INVALID_FORMAT,
				}),
			);
		}
		const sourceThreadId = parts[1];
		const similarThreadId = parts[2];
		const serverId = parts[3];
		if (!sourceThreadId || !similarThreadId || !serverId) {
			return yield* Effect.fail(
				new SimilarThreadsError({
					message: "Missing thread IDs or server ID in solved button customId",
					code: SimilarThreadsErrorCode.INVALID_FORMAT,
				}),
			);
		}
		return { sourceThreadId, similarThreadId, serverId };
	});
}

const MAX_BUTTON_LABEL_LENGTH = 80;
const SIMILAR_THREADS_FEEDBACK_BUTTON_ID = "similar-threads-feedback";

export const handleSimilarThreadsButtonInteraction = Effect.fn(
	"interaction.similar_threads_button",
)(function* (interaction: ButtonInteraction) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": interaction.guildId ?? "unknown",
		"discord.channel_id": interaction.channelId ?? "unknown",
		"discord.user_id": interaction.user.id,
		"interaction.custom_id": interaction.customId,
	});
	yield* Metric.increment(eventsProcessed);

	const discord = yield* Discord;
	const database = yield* Database;

	if (!interaction.guild) {
		return yield* Effect.fail(
			new SimilarThreadsError({
				message: "This button can only be used in a server",
				code: SimilarThreadsErrorCode.NOT_IN_GUILD,
			}),
		);
	}

	const { threadId, serverId } = yield* parseSimilarThreadsButtonId(
		interaction.customId,
	);

	yield* discord.callClient(() =>
		interaction.deferReply({ flags: MessageFlags.Ephemeral }),
	);

	const guild = interaction.guild;
	const thread = yield* discord.callClient(() =>
		guild.channels.fetch(threadId),
	);

	if (!thread || !thread.isThread()) {
		yield* discord.callClient(() =>
			interaction.editReply({
				content: "Could not find the thread. It may have been deleted.",
			}),
		);
		return;
	}

	const threadName = thread.name;

	let similarThreads = yield* database.public.search.getSimilarThreads(
		{
			searchQuery: threadName,
			currentThreadId: threadId,
			currentServerId: serverId,
			serverId: serverId,
			limit: 4,
		},
		{ subscribe: false },
	);

	yield* Effect.annotateCurrentSpan({
		"search.query": threadName,
		"search.results_count": similarThreads.length,
		"search.results": JSON.stringify(
			similarThreads.map((r, i) => ({
				index: i,
				message_id: String(r.message.message.id),
				channel_name: r.channel.name,
				channel_id: String(r.channel.id),
				thread_name: r.thread?.name ?? null,
				thread_id: r.thread?.id ? String(r.thread.id) : null,
				message_channel_id: String(r.message.message.channelId),
				message_parent_channel_id: r.message.message.parentChannelId
					? String(r.message.message.parentChannelId)
					: null,
				has_solutions: r.message.solutions.length > 0,
			})),
		),
	});

	if (similarThreads.length === 0) {
		const firstMessage = yield* discord.callClient(() =>
			thread.fetchStarterMessage(),
		);

		if (firstMessage?.content) {
			const contentSnippet = firstMessage.content.slice(0, 100);
			similarThreads = yield* database.public.search.getSimilarThreads(
				{
					searchQuery: contentSnippet,
					currentThreadId: threadId,
					currentServerId: serverId,
					serverId: serverId,
					limit: 5,
				},
				{ subscribe: false },
			);
		}
	}

	if (similarThreads.length === 0) {
		yield* discord.callClient(() =>
			interaction.editReply({
				content: "No similar threads found",
			}),
		);
		return;
	}

	const rows = similarThreads.map((result) => {
		const threadChannel = result.thread ?? result.channel;
		const similarThreadId =
			result.thread?.id ?? result.message.message.channelId;
		const threadUrl = `https://discord.com/channels/${result.server.discordId}/${similarThreadId}`;
		const isSolved = result.message.solutions.length > 0;
		const solvedPrefix = isSolved ? "✅ " : "";
		const labelText = `${solvedPrefix}${threadChannel.name}`;
		const truncatedLabel =
			labelText.length > MAX_BUTTON_LABEL_LENGTH
				? `${labelText.slice(0, MAX_BUTTON_LABEL_LENGTH - 3)}...`
				: labelText;

		const linkButton = new ButtonBuilder()
			.setLabel(truncatedLabel)
			.setURL(threadUrl)
			.setStyle(ButtonStyle.Link);

		const solvedButton = new ButtonBuilder()
			.setLabel("✅")
			.setCustomId(
				`${SIMILAR_THREAD_SOLVED_ACTION_PREFIX}:${threadId}:${similarThreadId}:${result.server.discordId}`,
			)
			.setStyle(ButtonStyle.Success);

		return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
			solvedButton,
			linkButton,
		);
	});

	const feedbackRow =
		new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
			new ButtonBuilder()
				.setLabel("Feedback")
				.setCustomId(SIMILAR_THREADS_FEEDBACK_BUTTON_ID)
				.setStyle(ButtonStyle.Secondary),
		);

	const threadCount = similarThreads.length;
	const content = `I found ${threadCount} similar thread${threadCount === 1 ? "" : "s"} for you. Click ✅ if one solved your question.`;

	yield* discord.callClient(() =>
		interaction.editReply({
			content,
			components: [...rows, feedbackRow],
		}),
	);

	const member = interaction.member;
	if (member && "user" in member) {
		yield* trackSimilarThreadsButtonClicked(
			member as GuildMember,
			thread,
			threadCount,
		);
	}
});

export const handleSimilarThreadSolvedButtonInteraction = Effect.fn(
	"interaction.similar_thread_solved_button",
)(function* (interaction: ButtonInteraction) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": interaction.guildId ?? "unknown",
		"discord.channel_id": interaction.channelId ?? "unknown",
		"discord.user_id": interaction.user.id,
		"interaction.custom_id": interaction.customId,
	});
	yield* Metric.increment(eventsProcessed);

	const discord = yield* Discord;

	if (!interaction.guild) {
		return yield* Effect.fail(
			new SimilarThreadsError({
				message: "This button can only be used in a server",
				code: SimilarThreadsErrorCode.NOT_IN_GUILD,
			}),
		);
	}

	const { sourceThreadId, similarThreadId, serverId } =
		yield* parseSimilarThreadSolvedButtonId(interaction.customId);

	yield* discord.callClient(() =>
		interaction.deferReply({ flags: MessageFlags.Ephemeral }),
	);

	const guild = interaction.guild;
	const sourceThread = yield* discord.callClient(() =>
		guild.channels.fetch(sourceThreadId),
	);

	if (!sourceThread || !sourceThread.isThread()) {
		yield* discord.callClient(() =>
			interaction.editReply({
				content: "Could not find the thread. It may have been deleted.",
			}),
		);
		return;
	}

	const similarThreadUrl = `https://discord.com/channels/${serverId}/${similarThreadId}`;
	const userId = interaction.user.id;

	yield* discord.callClient(() =>
		sourceThread.send({
			content: `<@${userId}> marked this post as solved via ${similarThreadUrl}`,
		}),
	);

	yield* discord.callClient(() =>
		interaction.editReply({
			content:
				"Thanks! I've posted a message in the thread linking to the solution.",
		}),
	);

	const member = interaction.member;
	if (member && "user" in member) {
		yield* trackSimilarThreadSolvedClicked(
			member as GuildMember,
			sourceThread,
			similarThreadId,
		);
	}
});

export const SimilarThreadsButtonHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (interaction.isButton()) {
					if (
						interaction.customId.startsWith(`${SIMILAR_THREADS_ACTION_PREFIX}:`)
					) {
						yield* handleSimilarThreadsButtonInteraction(interaction).pipe(
							catchAllWithReport((error) =>
								Console.error(
									"Error in similar threads button handler:",
									error,
								),
							),
						);
					} else if (
						interaction.customId.startsWith(
							`${SIMILAR_THREAD_SOLVED_ACTION_PREFIX}:`,
						)
					) {
						yield* handleSimilarThreadSolvedButtonInteraction(interaction).pipe(
							catchAllWithReport((error) =>
								Console.error(
									"Error in similar thread solved button handler:",
									error,
								),
							),
						);
					} else if (
						interaction.customId === SIMILAR_THREADS_FEEDBACK_BUTTON_ID
					) {
						yield* showFeedbackModal(SIMILAR_THREADS_FEEDBACK_CONFIG)(
							interaction,
						).pipe(
							catchAllWithReport((error) =>
								Console.error(
									"Error in similar threads feedback button handler:",
									error,
								),
							),
						);
					}
				} else if (
					interaction.isModalSubmit() &&
					interaction.customId === SIMILAR_THREADS_FEEDBACK_CONFIG.modalId
				) {
					yield* handleFeedbackModalSubmit(SIMILAR_THREADS_FEEDBACK_CONFIG)(
						interaction,
					).pipe(
						catchAllWithReport((error) =>
							Console.error(
								"Error in similar threads feedback modal handler:",
								error,
							),
						),
					);
				}
			}),
		);
	}),
);
