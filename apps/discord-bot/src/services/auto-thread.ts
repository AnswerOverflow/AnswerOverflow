import { Database } from "@packages/database/database";
import type { Message } from "discord.js";
import { MessageType } from "discord.js";
import { Data, Effect, Layer, Metric } from "effect";
import { ALLOWED_AUTO_THREAD_CHANNEL_TYPES } from "../constants/channel-types";
import { Discord } from "../core/discord-service";
import { autoThreadsCreated } from "../metrics";
import { isHumanMessage, removeDiscordMarkdown } from "../utils/message-utils";

export enum AutoThreadErrorCode {
	DM_OR_VOICE_CHANNEL = "DM_OR_VOICE_CHANNEL",
	INVALID_CHANNEL_TYPE = "INVALID_CHANNEL_TYPE",
	NOT_HUMAN_MESSAGE = "NOT_HUMAN_MESSAGE",
	INVALID_MESSAGE_TYPE = "INVALID_MESSAGE_TYPE",
	ALREADY_IN_THREAD = "ALREADY_IN_THREAD",
	AUTO_THREAD_DISABLED = "AUTO_THREAD_DISABLED",
	THREAD_CREATION_FAILED = "THREAD_CREATION_FAILED",
}

export class AutoThreadError extends Data.TaggedError("AutoThreadError")<{
	message: string;
	code: AutoThreadErrorCode;
}> {}

export function handleAutoThread(message: Message) {
	return Effect.gen(function* () {
		const database = yield* Database;
		if (message.channel.isDMBased() || message.channel.isVoiceBased()) {
			return yield* Effect.fail(
				new AutoThreadError({
					message: "Cannot create thread in DM or voice channel",
					code: AutoThreadErrorCode.DM_OR_VOICE_CHANNEL,
				}),
			);
		}

		const channelType = message.channel.type;
		if (!ALLOWED_AUTO_THREAD_CHANNEL_TYPES.has(channelType)) {
			return yield* Effect.fail(
				new AutoThreadError({
					message: `Channel type ${channelType} is not allowed for auto threads`,
					code: AutoThreadErrorCode.INVALID_CHANNEL_TYPE,
				}),
			);
		}

		if (!isHumanMessage(message)) {
			return yield* Effect.fail(
				new AutoThreadError({
					message: "Message is not from a human user",
					code: AutoThreadErrorCode.NOT_HUMAN_MESSAGE,
				}),
			);
		}
		if (message.type !== MessageType.Default) {
			return yield* Effect.fail(
				new AutoThreadError({
					message: `Message type ${message.type} is not supported`,
					code: AutoThreadErrorCode.INVALID_MESSAGE_TYPE,
				}),
			);
		}

		if (message.thread) {
			return yield* Effect.fail(
				new AutoThreadError({
					message: "Message is already in a thread",
					code: AutoThreadErrorCode.ALREADY_IN_THREAD,
				}),
			);
		}
		const channelLiveData =
			yield* database.private.channels.findChannelByDiscordId({
				discordId: BigInt(message.channel.id),
			});

		const channelSettings = channelLiveData ?? null;

		if (!channelSettings?.flags.autoThreadEnabled) {
			return yield* Effect.fail(
				new AutoThreadError({
					message: "Auto thread is disabled for this channel",
					code: AutoThreadErrorCode.AUTO_THREAD_DISABLED,
				}),
			);
		}

		const authorName = message.member?.nickname ?? message.author.displayName;

		let threadTitleContent = message.cleanContent;

		if (message.attachments.size > 0 && message.content.length === 0) {
			threadTitleContent = message.attachments.first()?.name ?? "Attachment";
		}

		threadTitleContent = removeDiscordMarkdown(threadTitleContent);

		let textTitle = `${authorName} - ${threadTitleContent}`;
		if (textTitle.length > 47) {
			textTitle = `${textTitle.slice(0, 47)}...`;
		}

		const discord = yield* Discord;
		yield* discord.callClient(() =>
			message.startThread({
				name: textTitle,
				reason: "Answer Overflow auto thread",
			}),
		);

		yield* Metric.increment(autoThreadsCreated);
	}).pipe(
		Effect.withSpan("auto_thread.handle", {
			attributes: {
				"message.id": message.id,
				"channel.id": message.channel.id,
				"author.id": message.author.id,
				"channel.type": message.channel.type.toString(),
			},
		}),
	);
}

export const AutoThreadHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("messageCreate", (message) =>
			handleAutoThread(message).pipe(
				Effect.catchTag("AutoThreadError", () => Effect.void),
			),
		);
	}),
);
