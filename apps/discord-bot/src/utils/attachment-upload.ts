import type { EmbedImageField } from "@packages/database/storage";
import { Storage } from "@packages/database/storage";
import { Array as Arr, Effect } from "effect";

interface AttachmentToUpload {
	id: string;
	url: string;
	filename: string;
	contentType?: string;
}

export function uploadAttachmentsWithStorage(
	attachments: Array<AttachmentToUpload>,
) {
	return Effect.gen(function* () {
		const storage = yield* Storage;

		return yield* Effect.forEach(attachments, (attachment) =>
			storage.uploadFileFromUrl({
				id: attachment.id,
				filename: attachment.filename,
				contentType: attachment.contentType,
				url: attachment.url,
			}),
		);
	});
}

export function uploadAttachmentsInBatches(
	allAttachments: Array<AttachmentToUpload>,
	batchSize = 5,
) {
	if (allAttachments.length === 0) {
		return Effect.void;
	}

	const batches = Arr.chunksOf(allAttachments, batchSize);

	return Effect.forEach(
		batches,
		(batch) => uploadAttachmentsWithStorage(batch),
		{ concurrency: 1, discard: true },
	);
}

export interface EmbedImageToUpload {
	url: string;
	messageId: bigint;
	embedIndex: number;
	field: EmbedImageField;
}

export function uploadEmbedImagesWithStorage(
	embedImages: Array<EmbedImageToUpload>,
) {
	return Effect.gen(function* () {
		const storage = yield* Storage;

		return yield* Effect.forEach(
			embedImages,
			(embedImage) =>
				storage.uploadEmbedImage({
					url: embedImage.url,
					messageId: embedImage.messageId,
					embedIndex: embedImage.embedIndex,
					field: embedImage.field,
				}),
			{ concurrency: 5 },
		);
	});
}

export function uploadEmbedImagesInBatches(
	allEmbedImages: Array<EmbedImageToUpload>,
	batchSize = 5,
) {
	if (allEmbedImages.length === 0) {
		return Effect.void;
	}

	const batches = Arr.chunksOf(allEmbedImages, batchSize);

	return Effect.forEach(
		batches,
		(batch) => uploadEmbedImagesWithStorage(batch),
		{ concurrency: 1, discard: true },
	);
}
