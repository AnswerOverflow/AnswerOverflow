import { Database } from "@packages/database/database";
import type { ButtonInteraction, GuildMember } from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags,
	type MessageActionRowComponentBuilder,
} from "discord.js";
import { Array as Arr, Console, Data, Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { eventsProcessed } from "../metrics";
import { trackSimilarThreadsButtonClicked } from "../utils/analytics";
import { SIMILAR_THREADS_ACTION_PREFIX } from "../utils/discord-components";
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

const MAX_BUTTON_LABEL_LENGTH = 80;

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
			limit: 5,
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

	const buttons = similarThreads.map((result) => {
		const threadChannel = result.thread ?? result.channel;
		const threadId = result.thread?.id ?? result.message.message.channelId;
		const threadUrl = `https://discord.com/channels/${result.server.discordId}/${threadId}`;
		const isSolved = result.message.solutions.length > 0;
		const solvedPrefix = isSolved ? "✅ " : "";
		const labelText = `${solvedPrefix}${threadChannel.name}`;
		const truncatedLabel =
			labelText.length > MAX_BUTTON_LABEL_LENGTH
				? `${labelText.slice(0, MAX_BUTTON_LABEL_LENGTH - 3)}...`
				: labelText;

		return new ButtonBuilder()
			.setLabel(truncatedLabel)
			.setURL(threadUrl)
			.setStyle(ButtonStyle.Link);
	});

	const rows = Arr.chunksOf(buttons, 5).map((chunk) =>
		new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
			chunk,
		),
	);

	const threadCount = similarThreads.length;
	const content = `I found ${threadCount} similar thread${threadCount === 1 ? "" : "s"} for you!`;

	yield* discord.callClient(() =>
		interaction.editReply({
			content,
			components: rows,
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

export const SimilarThreadsButtonHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					interaction.isButton() &&
					interaction.customId.startsWith(`${SIMILAR_THREADS_ACTION_PREFIX}:`)
				) {
					yield* handleSimilarThreadsButtonInteraction(interaction).pipe(
						catchAllWithReport((error) =>
							Console.error("Error in similar threads button handler:", error),
						),
					);
				}
			}),
		);
	}),
);
