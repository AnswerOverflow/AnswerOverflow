import type { Attachment } from "../db/schema";

export function transformAttachment(row: Attachment) {
	return {
		id: row.id,
		messageId: row.messageId,
		contentType: row.contentType ?? undefined,
		filename: row.filename,
		width: row.width ?? undefined,
		height: row.height ?? undefined,
		size: row.size,
		description: row.description ?? undefined,
	};
}
