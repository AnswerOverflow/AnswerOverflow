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
