import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Database } from "@packages/database/database";
import { Effect } from "effect";
import { z } from "zod";
import { runtime } from "@/lib/runtime";
import { registerConvexDebugTools } from "./convex-debug-tools";

const snowflakeSchema = z
	.string()
	.regex(/^\d+$/, "Expected a Discord snowflake ID");

type AttachmentUrlSummary = {
	host: string;
	path: string;
	expiresAt: string | null;
	isDiscordSignedUrl: boolean;
};

type PrivacyPost = {
	server: {
		discordId: bigint;
		name: string;
	};
	message: {
		author?: {
			id: bigint;
			isAnonymous?: boolean;
		} | null;
	};
};

function summarizeAttachmentUrl(rawUrl: string): AttachmentUrlSummary {
	try {
		const url = new URL(rawUrl);
		const expiryHex = url.searchParams.get("ex");
		const expirySeconds = expiryHex
			? Number.parseInt(expiryHex, 16)
			: Number.NaN;

		return {
			host: url.host,
			path: url.pathname,
			expiresAt: Number.isFinite(expirySeconds)
				? new Date(expirySeconds * 1000).toISOString()
				: null,
			isDiscordSignedUrl:
				url.hostname === "cdn.discordapp.com" ||
				url.hostname === "media.discordapp.net",
		};
	} catch {
		return {
			host: "invalid-url",
			path: rawUrl,
			expiresAt: null,
			isDiscordSignedUrl: false,
		};
	}
}

function toolResponse(value: unknown) {
	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify(
					value,
					(_key, item) => (typeof item === "bigint" ? item.toString() : item),
					2,
				),
			},
		],
	};
}

async function inspectMessageState(messageId: bigint) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const { rawMessage, header } = yield* Effect.all({
			rawMessage: database.private.messages.getMessageById({ id: messageId }),
			header: database.public.messages.getMessagePageHeaderData({ messageId }),
		});

		if (!rawMessage) {
			return {
				messageId: messageId.toString(),
				exists: false,
				publiclyResolvable: header !== null,
			};
		}

		const { server, serverPreferences, authorServerSettings } =
			yield* Effect.all({
				server: database.private.servers.getServerByDiscordId({
					discordId: rawMessage.serverId,
				}),
				serverPreferences:
					database.private.server_preferences.getServerPreferencesByServerId({
						serverId: rawMessage.serverId,
					}),
				authorServerSettings:
					database.private.user_server_settings.findUserServerSettingsById({
						userId: rawMessage.authorId,
						serverId: rawMessage.serverId,
					}),
			});

		const snapshotAttachments = (rawMessage.snapshot?.attachments ?? []).map(
			(attachment) => ({
				id: attachment.id.toString(),
				filename: attachment.filename,
				contentType: attachment.contentType ?? null,
				url: summarizeAttachmentUrl(attachment.url),
			}),
		);

		return {
			messageId: messageId.toString(),
			exists: true,
			publiclyResolvable: header !== null,
			message: {
				authorId: rawMessage.authorId.toString(),
				serverId: rawMessage.serverId.toString(),
				channelId: rawMessage.channelId.toString(),
				parentChannelId: rawMessage.parentChannelId?.toString() ?? null,
				childThreadId: rawMessage.childThreadId?.toString() ?? null,
				questionId: rawMessage.questionId?.toString() ?? null,
				referenceId: rawMessage.referenceId?.toString() ?? null,
				type: rawMessage.type ?? null,
				flags: rawMessage.flags ?? null,
				hasSnapshot: rawMessage.snapshot !== undefined,
				snapshotAttachmentCount: snapshotAttachments.length,
			},
			snapshotAttachments,
			server: server
				? {
						id: server.discordId.toString(),
						name: server.name,
						kickedTime: server.kickedTime ?? null,
					}
				: null,
			serverPreferences: serverPreferences
				? {
						considerAllMessagesPublicEnabled:
							serverPreferences.considerAllMessagesPublicEnabled ?? false,
						anonymizeMessagesEnabled:
							serverPreferences.anonymizeMessagesEnabled ?? false,
						readTheRulesConsentEnabled:
							serverPreferences.readTheRulesConsentEnabled ?? false,
					}
				: null,
			authorServerSettings: authorServerSettings
				? {
						permissions: authorServerSettings.permissions,
						roleIds:
							authorServerSettings.roleIds?.map((id) => id.toString()) ?? [],
						canPubliclyDisplayMessages:
							authorServerSettings.canPubliclyDisplayMessages,
						messageIndexingDisabled:
							authorServerSettings.messageIndexingDisabled,
					}
				: null,
		};
	}).pipe(runtime.runPromise);
}

async function inspectThreadMedia(threadId: bigint) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const header = yield* database.public.messages.getMessagePageHeaderData({
			messageId: threadId,
		});

		if (!header) {
			return { threadId: threadId.toString(), exists: false };
		}

		const channelId = header.threadId ?? header.canonicalId;
		const messages = yield* database.public.messages.getMessages({
			channelId,
			after: 0n,
			paginationOpts: { numItems: 100, cursor: null },
		});

		const forwardedSnapshots = messages.page.flatMap((entry) => {
			const snapshot = entry.message.snapshot;
			if (!snapshot) return [];

			return [
				{
					messageId: entry.message.id.toString(),
					attachmentCount: snapshot.attachments?.length ?? 0,
					attachments: (snapshot.attachments ?? []).map((attachment) => ({
						id: attachment.id.toString(),
						filename: attachment.filename,
						contentType: attachment.contentType ?? null,
						url: summarizeAttachmentUrl(attachment.url),
					})),
				},
			];
		});

		return {
			threadId: threadId.toString(),
			exists: true,
			canonicalId: header.canonicalId.toString(),
			messageCountInspected: messages.page.length,
			isComplete: messages.isDone,
			forwardedSnapshots,
			expiringDiscordAttachmentCount: forwardedSnapshots.reduce(
				(total, snapshot) =>
					total +
					snapshot.attachments.filter(
						(attachment) => attachment.url.isDiscordSignedUrl,
					).length,
				0,
			),
		};
	}).pipe(runtime.runPromise);
}

async function inspectUserPrivacy(userId: bigint, maxPosts: number) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const header =
			yield* database.public.discord_accounts.getUserPageHeaderData({
				userId,
			});

		const posts: PrivacyPost[] = [];
		let cursor: string | null = null;
		let isDone = false;

		while (!isDone && posts.length < maxPosts) {
			const pageResult: {
				page: PrivacyPost[];
				continueCursor: string;
				isDone: boolean;
			} = yield* database.public.discord_accounts.getUserPosts({
				userId,
				paginationOpts: {
					numItems: Math.min(100, maxPosts - posts.length),
					cursor,
				},
			});
			posts.push(...pageResult.page);
			cursor = pageResult.continueCursor;
			isDone = pageResult.isDone;
		}

		const serverSummaries = new Map<
			string,
			{
				serverId: bigint;
				serverName: string;
				messageCount: number;
				anonymousCount: number;
				identifiedCount: number;
				publicAuthorIds: Set<string>;
			}
		>();

		for (const post of posts) {
			const serverId = post.server.discordId;
			const key = serverId.toString();
			const summary = serverSummaries.get(key) ?? {
				serverId,
				serverName: post.server.name,
				messageCount: 0,
				anonymousCount: 0,
				identifiedCount: 0,
				publicAuthorIds: new Set<string>(),
			};

			summary.messageCount += 1;
			if (post.message.author?.isAnonymous) {
				summary.anonymousCount += 1;
			} else {
				summary.identifiedCount += 1;
			}
			if (post.message.author) {
				summary.publicAuthorIds.add(post.message.author.id.toString());
			}
			serverSummaries.set(key, summary);
		}

		const perServer = yield* Effect.forEach(
			Array.from(serverSummaries.values()),
			(summary) =>
				Effect.all({
					settings:
						database.private.user_server_settings.findUserServerSettingsById({
							userId,
							serverId: summary.serverId,
						}),
					preferences:
						database.private.server_preferences.getServerPreferencesByServerId({
							serverId: summary.serverId,
						}),
				}).pipe(
					Effect.map(({ settings, preferences }) => ({
						serverId: summary.serverId.toString(),
						serverName: summary.serverName,
						messageCount: summary.messageCount,
						anonymousCount: summary.anonymousCount,
						identifiedCount: summary.identifiedCount,
						publicAuthorIds: Array.from(summary.publicAuthorIds),
						serverAnonymizationEnabled:
							preferences?.anonymizeMessagesEnabled ?? false,
						considerAllMessagesPublicEnabled:
							preferences?.considerAllMessagesPublicEnabled ?? false,
						canPubliclyDisplayMessages:
							settings?.canPubliclyDisplayMessages ?? false,
						messageIndexingDisabled: settings?.messageIndexingDisabled ?? false,
					})),
				),
			{ concurrency: 8 },
		);

		const profilePublic = header !== null;
		const hasAnonymousPosts = perServer.some(
			(server) => server.anonymousCount > 0,
		);
		const hasIdentifiedPosts = perServer.some(
			(server) => server.identifiedCount > 0,
		);

		return {
			userId: userId.toString(),
			profilePublic,
			profileIdentity: header?.user ?? null,
			postsInspected: posts.length,
			isComplete: isDone,
			crossServerLinkabilityDetected:
				profilePublic && hasAnonymousPosts && hasIdentifiedPosts,
			servers: perServer,
		};
	}).pipe(runtime.runPromise);
}

async function inspectSolutionState(questionId: bigint, solutionId: bigint) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const { question, solution } = yield* Effect.all({
			question: database.private.messages.getMessageById({ id: questionId }),
			solution: database.private.messages.getMessageById({ id: solutionId }),
		});

		return {
			questionId: questionId.toString(),
			solutionId: solutionId.toString(),
			questionExists: question !== null,
			solutionExists: solution !== null,
			sameServer:
				question && solution ? question.serverId === solution.serverId : null,
			sameChannel:
				question && solution ? question.channelId === solution.channelId : null,
			solutionQuestionId: solution?.questionId?.toString() ?? null,
			question: question
				? {
						serverId: question.serverId.toString(),
						channelId: question.channelId.toString(),
						parentChannelId: question.parentChannelId?.toString() ?? null,
					}
				: null,
			solution: solution
				? {
						serverId: solution.serverId.toString(),
						channelId: solution.channelId.toString(),
						parentChannelId: solution.parentChannelId?.toString() ?? null,
					}
				: null,
		};
	}).pipe(runtime.runPromise);
}

async function deleteDiscordAccount(userId: bigint) {
	return Effect.gen(function* () {
		const database = yield* Database;
		yield* database.private.discord_accounts.deleteDiscordAccount({
			id: userId,
		});
		return { userId: userId.toString(), deleted: true };
	}).pipe(runtime.runPromise);
}

async function deleteIndexedMessage(messageId: bigint) {
	return Effect.gen(function* () {
		const database = yield* Database;
		yield* database.private.messages.deleteMessage({ id: messageId });
		return { messageId: messageId.toString(), deleted: true };
	}).pipe(runtime.runPromise);
}

async function findDiscordAccountsByName(name: string, limit: number) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const accounts =
			yield* database.private.discord_accounts.findDiscordAccountsByName({
				name,
				limit,
			});
		return {
			accounts: accounts.map((account) => ({
				id: account.id.toString(),
				name: account.name,
			})),
		};
	}).pipe(runtime.runPromise);
}

/** Registers tools for internal Answer Overflow debugging. */
export function registerInternalDebugTools(server: McpServer) {
	registerConvexDebugTools(server);

	server.registerTool(
		"inspect_message_state",
		{
			title: "Inspect Message State",
			description:
				"Inspect raw and public Convex state for one Discord message, including privacy settings and forwarded snapshot attachment expiry metadata.",
			inputSchema: { messageId: snowflakeSchema },
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ messageId }) =>
			toolResponse(await inspectMessageState(BigInt(messageId))),
	);

	server.registerTool(
		"inspect_thread_media",
		{
			title: "Inspect Thread Media",
			description:
				"Inspect forwarded message snapshots in a thread and identify media URLs that still depend on expiring Discord signatures.",
			inputSchema: { threadId: snowflakeSchema },
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ threadId }) =>
			toolResponse(await inspectThreadMedia(BigInt(threadId))),
	);

	server.registerTool(
		"inspect_user_privacy",
		{
			title: "Inspect User Privacy",
			description:
				"Inspect how one Discord user's public and anonymized posts are exposed across servers, without returning API keys or message bodies.",
			inputSchema: {
				userId: snowflakeSchema,
				maxPosts: z.number().int().min(1).max(500).default(250).optional(),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ userId, maxPosts }) =>
			toolResponse(await inspectUserPrivacy(BigInt(userId), maxPosts ?? 250)),
	);

	server.registerTool(
		"inspect_solution_state",
		{
			title: "Inspect Solution State",
			description:
				"Check whether a question and proposed solution message are indexed and compatible before investigating a mark-solution failure.",
			inputSchema: {
				questionId: snowflakeSchema,
				solutionId: snowflakeSchema,
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ questionId, solutionId }) =>
			toolResponse(
				await inspectSolutionState(BigInt(questionId), BigInt(solutionId)),
			),
	);

	server.registerTool(
		"delete_discord_account",
		{
			title: "Delete Discord Account",
			description:
				"Delete one indexed Discord account by ID, along with its indexed messages and per-server settings, and prevent it from being re-indexed.",
			inputSchema: { userId: snowflakeSchema },
			annotations: { readOnlyHint: false, openWorldHint: false },
		},
		async ({ userId }) =>
			toolResponse(await deleteDiscordAccount(BigInt(userId))),
	);

	server.registerTool(
		"delete_indexed_message",
		{
			title: "Delete Indexed Message",
			description: "Delete one indexed Discord message by ID.",
			inputSchema: { messageId: snowflakeSchema },
			annotations: { readOnlyHint: false, openWorldHint: false },
		},
		async ({ messageId }) =>
			toolResponse(await deleteIndexedMessage(BigInt(messageId))),
	);

	server.registerTool(
		"find_discord_accounts_by_name",
		{
			title: "Find Discord Accounts By Name",
			description:
				"Look up indexed Discord accounts by exact username, returning only account IDs and names.",
			inputSchema: {
				name: z.string(),
				limit: z.number().int().min(1).max(100).default(20).optional(),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ name, limit }) =>
			toolResponse(await findDiscordAccountsByName(name, limit ?? 20)),
	);
}
