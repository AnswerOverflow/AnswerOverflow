import type { GitHubRepo } from "@packages/database/convex/shared/auth/github";
import { makeMainSiteLink } from "@packages/ui/utils/links";
import type { Message } from "discord.js";
import { Data } from "effect";

export type UploadedAttachment = {
	filename: string;
	contentType: string | undefined;
	url: string;
};

export const GITHUB_APP_INSTALL_URL =
	process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL ??
	"https://github.com/apps/answer-overflow/installations/new";

export const INSTALL_MORE_REPOS_VALUE = "__install_more_repos__";

export class GitHubIssueTimeoutError extends Data.TaggedError(
	"GitHubIssueTimeoutError",
)<{
	readonly message: string;
	readonly guildId?: string;
	readonly channelId?: string;
	readonly userId?: string;
	readonly targetMessageId?: string;
}> {}

export type { GitHubRepo };
export { makeMainSiteLink };

export type IssueFooterOptions = {
	message: Message;
	indexingEnabled: boolean;
	hasPaidPlan: boolean;
};

export function buildIssueFooter({
	message,
	indexingEnabled,
	hasPaidPlan,
}: IssueFooterOptions): string {
	const authorMention = message.author.username;
	const discordLink = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;

	const viewLink = indexingEnabled
		? `[View on Answer Overflow](${makeMainSiteLink(`/m/${message.id}`)})`
		: `[View on Discord](${discordLink})`;

	const attribution = hasPaidPlan
		? ""
		: `

\n---
*Created by [Answer Overflow](https://answeroverflow.com/about)*`;

	return `
\n---
📎 ${viewLink} | 👤 Posted by ${authorMention}${attribution}`;
}

const IMAGE_CONTENT_TYPES = [
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
	"image/svg+xml",
];

function isImageAttachment(attachment: UploadedAttachment): boolean {
	if (attachment.contentType) {
		return IMAGE_CONTENT_TYPES.includes(attachment.contentType);
	}
	const ext = attachment.filename.split(".").pop()?.toLowerCase() ?? "";
	return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
}

export function buildAttachmentsSection(
	attachments: ReadonlyArray<UploadedAttachment>,
): string {
	if (attachments.length === 0) return "";

	const lines = attachments.map((a) => {
		if (isImageAttachment(a)) {
			return `![${a.filename}](${a.url})`;
		}
		return `[${a.filename}](${a.url})`;
	});

	return `\n\n### Attachments\n\n${lines.join("\n\n")}`;
}

export function buildIssueBody(
	aiBody: string,
	attachmentsSection: string,
	footer: string,
): string {
	return `${aiBody}${attachmentsSection}${footer}`;
}

export function generateFallbackTitle(message: Message): string {
	const channel = message.channel;
	if (channel.isThread() && channel.name) {
		return channel.name.slice(0, 80);
	}

	const firstLine = message.content.split("\n")[0] ?? "";
	if (firstLine.length > 80) {
		return `${firstLine.slice(0, 77)}...`;
	}
	return firstLine || "Issue from Discord";
}

export function generateFallbackBody(message: Message): string {
	return message.content
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");
}
