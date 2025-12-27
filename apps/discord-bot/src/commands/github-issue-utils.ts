import type { GitHubRepo } from "@packages/database/convex/shared/auth/github";
import { makeMainSiteLink } from "@packages/ui/utils/links";
import type { Message } from "discord.js";
import { Data } from "effect";

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

export type IssueBodyOptions = {
	message: Message;
	additionalContext?: string;
	indexingEnabled?: boolean;
	hasPaidPlan?: boolean;
};

export function generateIssueBody({
	message,
	additionalContext,
	indexingEnabled,
	hasPaidPlan,
}: IssueBodyOptions): string {
	const authorMention = message.author.username;
	const discordLink = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;

	const quotedContent = message.content
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");

	const viewLink = indexingEnabled
		? `[View on Answer Overflow](${makeMainSiteLink(`/m/${message.id}`)})`
		: `[View on Discord](${discordLink})`;

	const attribution = hasPaidPlan
		? ""
		: `

---
*Created by [Answer Overflow](https://answeroverflow.com/about)*`;

	const footer = `
---
📎 ${viewLink} | 👤 Posted by @${authorMention}${attribution}`;

	if (additionalContext) {
		return `${additionalContext}

---

**Original Discord Message:**

${quotedContent}${footer}`;
	}

	return `${quotedContent}${footer}`;
}

export function generateIssueTitle(message: Message): string {
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
