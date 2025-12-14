type Attachment = {
	filename: string;
	contentType?: string;
};

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];

export function isImageAttachment(attachment: Attachment) {
	const filename = attachment.filename.toLowerCase();
	return (
		IMAGE_EXTENSIONS.some((ext) => filename.endsWith(ext)) ||
		attachment.contentType?.startsWith("image/") === true
	);
}
