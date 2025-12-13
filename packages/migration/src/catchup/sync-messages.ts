import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { getDb } from "../db/client";
import { dbAttachments, dbEmojis, dbMessages, dbReactions } from "../db/schema";
import { transformAttachment } from "../transformers/attachment";
import { transformMessage } from "../transformers/message";
import type { DatabaseService, SyncContext, SyncResult } from "./types";

const BATCH_SIZE = 100;
const CONCURRENT_WRITES = 50;

interface MessageWithRelations {
	messageId: string;
	attachments: Array<{
		id: bigint;
		messageId: bigint;
		contentType?: string;
		filename: string;
		width?: number;
		height?: number;
		size: number;
		description?: string;
	}>;
	reactions: Array<{
		userId: bigint;
		emoji: {
			id: bigint;
			name: string;
		};
	}>;
}

async function fetchAttachmentsForMessages(
	messageIds: string[],
): Promise<Map<string, MessageWithRelations["attachments"]>> {
	if (messageIds.length === 0) return new Map();

	const attachments = await getDb()
		.select()
		.from(dbAttachments)
		.where(
			sql`${dbAttachments.messageId} IN (${sql.join(
				messageIds.map((id) => sql`${id}`),
				sql`, `,
			)})`,
		);

	const map = new Map<string, MessageWithRelations["attachments"]>();

	for (const att of attachments) {
		const transformed = transformAttachment(att);
		const existing = map.get(att.messageId) ?? [];
		existing.push({
			id: BigInt(transformed.id),
			messageId: BigInt(transformed.messageId),
			contentType: transformed.contentType,
			filename: transformed.filename,
			width: transformed.width,
			height: transformed.height,
			size: transformed.size,
			description: transformed.description,
		});
		map.set(att.messageId, existing);
	}

	return map;
}

async function fetchReactionsForMessages(
	messageIds: string[],
): Promise<Map<string, MessageWithRelations["reactions"]>> {
	if (messageIds.length === 0) return new Map();

	const reactions = await getDb()
		.select()
		.from(dbReactions)
		.where(
			sql`${dbReactions.messageId} IN (${sql.join(
				messageIds.map((id) => sql`${id}`),
				sql`, `,
			)})`,
		);

	const emojiIds = [...new Set(reactions.map((r) => r.emojiId))];

	const emojis =
		emojiIds.length > 0
			? await getDb()
					.select()
					.from(dbEmojis)
					.where(
						sql`${dbEmojis.id} IN (${sql.join(
							emojiIds.map((id) => sql`${id}`),
							sql`, `,
						)})`,
					)
			: [];

	const emojiMap = new Map(emojis.map((e) => [e.id, e]));

	const map = new Map<string, MessageWithRelations["reactions"]>();

	for (const reaction of reactions) {
		const emoji = emojiMap.get(reaction.emojiId);
		if (!emoji) continue;

		const existing = map.get(reaction.messageId) ?? [];
		existing.push({
			userId: BigInt(reaction.userId),
			emoji: {
				id: BigInt(emoji.id),
				name: emoji.name,
			},
		});
		map.set(reaction.messageId, existing);
	}

	return map;
}

export function syncMessages(
	database: DatabaseService,
	ctx: SyncContext,
): Effect.Effect<SyncResult, Error> {
	return Effect.gen(function* () {
		const result: SyncResult = { synced: 0, failed: 0, skipped: 0 };
		const { minSnowflake, options, onProgress } = ctx;

		let cursor = minSnowflake;
		let attachmentCount = 0;
		let reactionCount = 0;

		while (true) {
			const rows = yield* Effect.tryPromise({
				try: () =>
					getDb()
						.select()
						.from(dbMessages)
						.where(sql`${dbMessages.id} > ${cursor}`)
						.orderBy(dbMessages.id)
						.limit(BATCH_SIZE),
				catch: (e) => new Error(`Failed to fetch messages: ${e}`),
			});

			if (rows.length === 0) break;

			const messageIds = rows.map((r) => r.id);

			const [attachmentsMap, reactionsMap] = yield* Effect.tryPromise({
				try: async () => {
					const [attachments, reactions] = await Promise.all([
						fetchAttachmentsForMessages(messageIds),
						fetchReactionsForMessages(messageIds),
					]);
					return [attachments, reactions] as const;
				},
				catch: (e) => new Error(`Failed to fetch message relations: ${e}`),
			});

			if (options.dryRun) {
				for (const row of rows) {
					const attachments = attachmentsMap.get(row.id) ?? [];
					const reactions = reactionsMap.get(row.id) ?? [];
					attachmentCount += attachments.length;
					reactionCount += reactions.length;
					result.synced++;
					if (result.synced <= 3) {
						console.log(
							`  Would sync message: ${row.id} (${attachments.length} attachments, ${reactions.length} reactions)`,
						);
					}
				}
			} else {
				const effects = rows.map((row) => {
					const message = transformMessage(row);
					const attachments = attachmentsMap.get(row.id) ?? [];
					const reactions = reactionsMap.get(row.id) ?? [];

					return Effect.gen(function* () {
						const syncEffect = database.private.messages.upsertMessage({
							message: {
								id: BigInt(message.id),
								authorId: BigInt(message.authorId),
								serverId: BigInt(message.serverId),
								channelId: BigInt(message.channelId),
								parentChannelId: message.parentChannelId
									? BigInt(message.parentChannelId)
									: undefined,
								childThreadId: message.childThreadId
									? BigInt(message.childThreadId)
									: undefined,
								questionId: message.questionId
									? BigInt(message.questionId)
									: undefined,
								referenceId: message.referenceId
									? BigInt(message.referenceId)
									: undefined,
								applicationId: message.applicationId
									? BigInt(message.applicationId)
									: undefined,
								interactionId: message.interactionId
									? BigInt(message.interactionId)
									: undefined,
								webhookId: message.webhookId
									? BigInt(message.webhookId)
									: undefined,
								content: message.content,
								flags: message.flags,
								type: message.type,
								pinned: message.pinned,
								nonce: message.nonce,
								tts: message.tts,
								embeds: message.embeds,
							},
							attachments: attachments.length > 0 ? attachments : undefined,
							reactions: reactions.length > 0 ? reactions : undefined,
							ignoreChecks: true,
						});

						const syncResult = yield* Effect.either(syncEffect);

						if (syncResult._tag === "Left") {
							console.error(
								`  Failed to sync message ${row.id}:`,
								syncResult.left,
							);
							return { success: false, attachments: 0, reactions: 0 };
						}
						return {
							success: true,
							attachments: attachments.length,
							reactions: reactions.length,
						};
					});
				});

				const results = yield* Effect.all(effects, {
					concurrency: CONCURRENT_WRITES,
				});

				for (const r of results) {
					if (r.success) {
						result.synced++;
						attachmentCount += r.attachments;
						reactionCount += r.reactions;
					} else {
						result.failed++;
					}
				}
			}

			const lastRow = rows[rows.length - 1];
			if (lastRow) {
				cursor = lastRow.id;
				onProgress(cursor, result.synced + result.failed);
			}
		}

		if (options.dryRun) {
			console.log(`  Total attachments: ${attachmentCount}`);
			console.log(`  Total reactions: ${reactionCount}`);
		}

		return result;
	});
}

export async function countMessages(minSnowflake: string): Promise<number> {
	const result = await getDb()
		.select({ count: sql<number>`COUNT(*)` })
		.from(dbMessages)
		.where(sql`${dbMessages.id} > ${minSnowflake}`);

	return result[0]?.count ?? 0;
}
