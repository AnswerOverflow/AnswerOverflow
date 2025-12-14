import { isImageAttachment } from "@packages/ui/utils/attachments";
import { encodeCursor } from "@packages/ui/utils/cursor";
import { getDate } from "@packages/ui/utils/snowflake";
import type {
	MessagePageHeaderData,
	MessagePageReplies,
} from "../components/message-page-loader";

function formatDate(snowflake: bigint): string {
	const date = getDate(snowflake);
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatMessageContent(
	message: {
		message: { content: string | null };
		attachments: Array<{ url: string; filename: string; contentType?: string }>;
	} | null,
): string {
	if (!message) {
		return "_Original message was deleted_";
	}

	const parts: Array<string> = [];

	if (message.message.content) {
		parts.push(message.message.content);
	}

	const imageAttachments = message.attachments.filter((a) =>
		isImageAttachment(a),
	);
	for (const attachment of imageAttachments) {
		parts.push(`![${attachment.filename}](${attachment.url})`);
	}

	const otherAttachments = message.attachments.filter(
		(a) => !isImageAttachment(a),
	);
	for (const attachment of otherAttachments) {
		parts.push(`[${attachment.filename}](${attachment.url})`);
	}

	return parts.join("\n\n") || "_No content_";
}

function formatReply(
	reply: MessagePageReplies["page"][number],
	isLast: boolean,
): string {
	const authorName = reply.author?.name ?? "Unknown User";
	const date = formatDate(reply.message.id);
	const content = formatMessageContent(reply);

	const lines = [`**@${authorName}** - ${date}`, "", content];

	if (!isLast) {
		lines.push("", "---");
	}

	return lines.join("\n");
}

const HIDDEN_AUTHOR_IDS = [958907348389339146n];

export function buildMessageMarkdown(data: {
	headerData: MessagePageHeaderData;
	replies: MessagePageReplies;
	messageId: string;
}): string {
	const { headerData, replies, messageId } = data;

	const title =
		headerData.thread?.name ??
		headerData.firstMessage?.message.content?.slice(0, 100) ??
		headerData.channel.name;

	const postedDate = headerData.firstMessage
		? formatDate(headerData.firstMessage.message.id)
		: null;

	const lines: Array<string> = [];

	lines.push(`# ${title}`);
	lines.push("");

	const metaParts = [
		`**Server:** ${headerData.server.name}`,
		`**Channel:** #${headerData.channel.name}`,
	];
	if (postedDate) {
		metaParts.push(`**Posted:** ${postedDate}`);
	}
	lines.push(metaParts.join(" | "));
	lines.push("");
	lines.push("---");
	lines.push("");

	lines.push("## Question");
	lines.push("");
	lines.push(formatMessageContent(headerData.firstMessage));
	lines.push("");
	lines.push("---");

	if (headerData.solutionMessage) {
		lines.push("");
		lines.push("## Solution ✓");
		lines.push("");
		lines.push(formatMessageContent(headerData.solutionMessage));
		lines.push("");
		lines.push("---");
	}

	if (replies.page.length > 0) {
		lines.push("");
		lines.push("## Replies");
		lines.push("");

		const filteredReplies = replies.page.filter(
			(r) => !HIDDEN_AUTHOR_IDS.includes(r.message.authorId),
		);

		for (let i = 0; i < filteredReplies.length; i++) {
			const reply = filteredReplies[i];
			if (!reply) continue;
			const isLast = i === filteredReplies.length - 1 && replies.isDone;
			lines.push(formatReply(reply, isLast));
			lines.push("");
		}
	}

	if (!replies.isDone && replies.continueCursor) {
		const encodedCursor = encodeCursor(replies.continueCursor);
		lines.push("");
		lines.push(
			`[Load more of the conversation](/m/${messageId}.md?cursor=${encodedCursor})`,
		);
	}

	return lines.join("\n");
}

export function createMarkdownResponse(markdown: string): Response {
	return new Response(markdown, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
		},
	});
}
