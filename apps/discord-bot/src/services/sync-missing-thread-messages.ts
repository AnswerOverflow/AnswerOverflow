import { Database } from "@packages/database/database";
import { ChannelType } from "discord.js";
import {
	Array as Arr,
	Console,
	Duration,
	Effect,
	Option,
} from "effect";
import { Discord } from "../core/discord-service";
import {
	catchAllWithReport,
} from "../utils/error-reporting";
import {
	toAODiscordAccount,
	toAOMessage,
	toUpsertMessageArgs,
} from "../utils/conversions";
import {
	uploadAttachmentsInBatches,
	uploadEmbedImagesInBatches,
} from "../utils/attachment-upload";
import { extractEmbedImagesToUpload } from "../utils/conversions";

const SYNC_CONFIG = {
	batchSize: 10,
	batchDelay: Duration.millis(100),
	convexBatchSize: 15,
} as const;

export function syncMissingThreadMessages() {
	return Effect.gen(function* () {
		const database = yield* Database;
		const discord = yield* Discord;

		yield* Console.log("=== Starting sync of missing thread messages ===");

		const result = yield* database.private.threads.findThreadsMissingRootMessage({});

		yield* Console.log(
			`Found ${result.threads.length} threads missing their root message (processed ${result.totalChannelsProcessed} channels)`,
		);

		if (result.threads.length === 0) {
			yield* Console.log("No threads need syncing");
			return { synced: 0, failed: 0, skipped: 0 };
		}

		let synced = 0;
		let failed = 0;
		let skipped = 0;

		const batches = Arr.chunksOf(result.threads, SYNC_CONFIG.batchSize);

		for (const batch of batches) {
			yield* Effect.forEach(
				batch,
				(thread) =>
					syncThreadRootMessage(thread).pipe(
						Effect.tap(() =>
							Effect.sync(() => {
								synced++;
							}),
						),
						Effect.catchAll((error) =>
							Effect.gen(function* () {
								if (
									error instanceof Error &&
									(error.message.includes("not found") ||
										error.message.includes("Unknown Message"))
								) {
									skipped++;
									yield* Console.warn(
										`Thread ${thread.threadId}: Message not found on Discord (may have been deleted)`,
									);
								} else {
									failed++;
									yield* Console.error(
										`Thread ${thread.threadId}: Failed to sync - ${error}`,
									);
								}
							}),
						),
					),
				{ concurrency: 3 },
			);

			yield* Effect.sleep(SYNC_CONFIG.batchDelay);
		}

		yield* Console.log(
			`=== Sync complete: ${synced} synced, ${skipped} skipped (not found), ${failed} failed ===`,
		);

		return { synced, failed, skipped };
	});
}

function syncThreadRootMessage(thread: {
	threadId: bigint;
	serverId: bigint;
	parentChannelId: bigint | undefined;
}) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const discord = yield* Discord;

		const threadIdStr = thread.threadId.toString();

		// First, we need to fetch the thread channel to access the message
		const threadChannel = yield* discord.getChannel(threadIdStr);

		if (!threadChannel) {
			throw new Error(`Thread channel ${threadIdStr} not found in cache`);
		}

		if (
			threadChannel.type !== ChannelType.PublicThread &&
			threadChannel.type !== ChannelType.AnnouncementThread
		) {
			throw new Error(
				`Channel ${threadIdStr} is not a thread (type: ${threadChannel.type})`,
			);
		}

		// Fetch the specific message with ID === thread ID
		const message = yield* discord.callClient(() =>
			threadChannel.messages.fetch(threadIdStr),
		);

		if (!message) {
			throw new Error(`Message ${threadIdStr} not found in thread`);
		}

		// Skip system messages
		if (message.system) {
			yield* Console.log(`Thread ${threadIdStr}: Skipping system message`);
			return;
		}

		yield* Effect.logDebug(`Thread ${threadIdStr}: Fetched root message`);

		// Convert the message to AO format
		const aoMessage = yield* Effect.tryPromise(() =>
			toAOMessage(message, thread.serverId.toString()),
		);

		// Upsert the author
		yield* database.private.discord_accounts.upsertDiscordAccount({
			account: toAODiscordAccount(message.author),
		});

		// Upsert the message
		yield* database.private.messages.upsertMessage({
			...toUpsertMessageArgs(aoMessage),
			ignoreChecks: false,
		});

		yield* Console.log(`Thread ${threadIdStr}: Successfully synced root message`);

		// Upload attachments if any
		const attachments = Arr.fromIterable(message.attachments.values());
		if (attachments.length > 0) {
			const attachmentsToUpload = attachments.map((att) => ({
				id: att.id,
				url: att.url,
				filename: att.name ?? "",
				contentType: att.contentType ?? undefined,
			}));
			yield* uploadAttachmentsInBatches(attachmentsToUpload).pipe(
				catchAllWithReport((error) =>
					Console.warn(
						`Thread ${threadIdStr}: Failed to upload attachments - ${error}`,
					),
				),
			);
		}

		// Upload embed images if any
		const embedImages = extractEmbedImagesToUpload(message);
		if (embedImages.length > 0) {
			yield* uploadEmbedImagesInBatches(embedImages).pipe(
				catchAllWithReport((error) =>
					Console.warn(
						`Thread ${threadIdStr}: Failed to upload embed images - ${error}`,
					),
				),
			);
		}
	});
}
