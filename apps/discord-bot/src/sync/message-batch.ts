import { Database } from "@packages/database/database";
import type { EmbedImageField } from "@packages/database/storage";
import { Console, Effect } from "effect";
import { uploadEmbedImagesInBatches } from "../utils/attachment-upload";
import type { toUpsertMessageArgs } from "../utils/conversions";
import { catchAllWithReport } from "../utils/error-reporting";

/** A message snapshot and its relations, ready for the existing Convex upsert. */
export type MessageUpsertArgs = ReturnType<typeof toUpsertMessageArgs>;

function embedImagesForSnapshot({ message }: MessageUpsertArgs) {
	return (message.embeds ?? []).flatMap((embed, embedIndex) => {
		const fields: Array<readonly [EmbedImageField, string | undefined]> = [
			["image", embed.image?.url],
			["thumbnail", embed.thumbnail?.url],
			["video", embed.video?.url],
			["footerIcon", embed.footer?.proxyIconUrl],
			["authorIcon", embed.author?.proxyIconUrl],
		];
		return fields.flatMap(([field, url]) =>
			url ? [{ messageId: message.id, embedIndex, field, url }] : [],
		);
	});
}

/**
 * Persist the newest snapshot of each message before uploading its embed media.
 * Called inside the channel queue, so later batches wait for these uploads.
 * Messages rejected by the existing indexing/privacy checks do not upload media.
 * Media failures are reported per message without dropping the rest of the batch.
 */
export function persistMessageBatch(batch: ReadonlyArray<MessageUpsertArgs>) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const snapshots = new Map(batch.map((item) => [item.message.id, item]));
		const messages = Array.from(snapshots.values());
		const result = yield* database.private.messages.upsertManyMessages({
			messages,
			ignoreChecks: false,
		});
		const persistedIds = new Set(result.created);
		for (const snapshot of messages) {
			if (!persistedIds.has(snapshot.message.id)) continue;
			const images = embedImagesForSnapshot(snapshot);
			yield* uploadEmbedImagesInBatches(images).pipe(
				Effect.withSpan("sync.message.upload_embed_images", {
					attributes: { "embed_images.count": images.length.toString() },
				}),
				catchAllWithReport((error) =>
					Console.warn(
						`Failed to upload embed images for message ${snapshot.message.id}:`,
						error,
					),
				),
			);
		}
	});
}
