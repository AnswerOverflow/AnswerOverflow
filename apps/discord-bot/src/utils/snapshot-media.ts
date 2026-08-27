import { parseDiscordAttachmentUrl } from "@packages/database/convex/shared/mediaUrl";
import { type Message, MessageReferenceType } from "discord.js";

export interface SnapshotMediaToUpload {
	id: string;
	url: string;
	filename: string;
	contentType?: string;
}

/**
 * Collects media from a forwarded message's snapshot so the bytes can be
 * rehosted on S3 under `${attachmentId}/${filename}` before the signed
 * Discord CDN URLs expire. Snapshot attachments are not stored in the
 * regular attachments table, so they are never picked up by the normal
 * attachment upload path.
 */
export function extractSnapshotMediaToUpload(
	message: Message,
): SnapshotMediaToUpload[] {
	if (message.reference?.type !== MessageReferenceType.Forward) {
		return [];
	}

	const snapshot = message.messageSnapshots?.first();
	if (!snapshot) {
		return [];
	}

	const result: SnapshotMediaToUpload[] = [];
	const seen = new Set<string>();
	const add = (item: SnapshotMediaToUpload) => {
		const key = `${item.id}/${item.filename}`;
		if (seen.has(key)) {
			return;
		}
		seen.add(key);
		result.push(item);
	};

	for (const attachment of snapshot.attachments?.values() ?? []) {
		add({
			id: attachment.id,
			url: attachment.url,
			filename: attachment.name ?? "",
			contentType: attachment.contentType ?? undefined,
		});
	}

	for (const embed of snapshot.embeds ?? []) {
		for (const url of [
			embed.image?.url,
			embed.thumbnail?.url,
			embed.video?.url,
		]) {
			if (!url) {
				continue;
			}
			const parsed = parseDiscordAttachmentUrl(url);
			if (!parsed) {
				continue;
			}
			add({ id: parsed.id, url, filename: parsed.filename });
		}
	}

	return result;
}
