// edge has issues so this is a workaround

import { DBError } from './utils/error';
import {
	findIgnoredDiscordAccountById,
	findManyIgnoredDiscordAccountsById,
} from './ignored-discord-account';
import {
	findManyUserServerSettings,
	findUserServerSettingsById,
} from './user-server-settings';
import { db } from './db';
import {
	BaseMessageWithRelations,
	dbMessages,
	dbAttachments,
	dbReactions,
	dbEmojis,
	messageSchema,
	attachmentSchema,
	emojiSchema,
	reactionSchema,
} from './schema';
import { eq, inArray, sql } from 'drizzle-orm';

// yes the way file uploading is handled here is bad, i'll fix it later i promise, i was young dumb and needed to ship
import { uploadFileFromUrl } from './files';
import {
	CANNOT_UPSERT_MESSAGE_FOR_IGNORED_ACCOUNT_MESSAGE,
	CANNOT_UPSERT_MESSAGE_FOR_USER_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE,
} from './message';

export async function upsertMessage(
	data: BaseMessageWithRelations,
	opts?: {
		ignoreChecks?: boolean;
	},
) {
	if (!opts?.ignoreChecks) {
		const [ignoredAccount, userServerSettings] = await Promise.all([
			findIgnoredDiscordAccountById(data.authorId),
			findUserServerSettingsById({
				userId: data.authorId,
				serverId: data.serverId,
			}),
		]);
		if (ignoredAccount) {
			throw new DBError(
				CANNOT_UPSERT_MESSAGE_FOR_IGNORED_ACCOUNT_MESSAGE,
				'IGNORED_ACCOUNT',
			);
		}
		if (userServerSettings?.flags.messageIndexingDisabled) {
			throw new DBError(
				CANNOT_UPSERT_MESSAGE_FOR_USER_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE,
				'MESSAGE_INDEXING_DISABLED',
			);
		}
	}
	const { attachments, reactions, embeds, ...msg } = data;
	const parsed = {
		...messageSchema.parse(msg),
		embeds,
	};

	await db.insert(dbMessages).values(parsed).onDuplicateKeyUpdate({
		set: parsed,
	});
	const updateAttachments = async () => {
		const existingAttachments = await db
			.select()
			.from(dbAttachments)
			.where(eq(dbAttachments.messageId, msg.id));
		const existingAttachmentIds = new Set(existingAttachments.map((a) => a.id));

		if (!attachments) {
			await db.delete(dbAttachments).where(eq(dbAttachments.messageId, msg.id));
			return;
		}
		for await (const attachment of attachments) {
			if (!existingAttachmentIds.has(attachment.id)) {
				void uploadFileFromUrl({
					url: attachment.url,
					id: attachment.id,
					contentType: attachment.contentType ?? undefined,
					filename: attachment.filename,
				}).then(async (uploaded) => {
					if (!uploaded) return;
					await db.insert(dbAttachments).values(
						attachmentSchema.parse({
							...attachment,
							proxyUrl: `https://cdn.answeroverflow.com/${attachment.id}/${attachment.filename}`,
						}),
					);
				});
			}
		}
	};
	const updateReactions = async () => {
		await db.delete(dbReactions).where(eq(dbReactions.messageId, msg.id));
		if (!reactions) return;
		const emojis = new Set(reactions.map((r) => r.emoji));
		for await (const emoji of emojis) {
			const p = emojiSchema.parse(emoji);
			await db.insert(dbEmojis).values(p).onDuplicateKeyUpdate({
				set: p,
			});
		}
		for await (const reaction of reactions) {
			const p = reactionSchema.parse(reaction);
			await db.insert(dbReactions).values(p).onDuplicateKeyUpdate({
				set: p,
			});
		}
	};
	await updateReactions();
	void updateAttachments();
}

export async function upsertManyMessages(
	data: BaseMessageWithRelations[],
	opts?: {
		ignoreChecks?: boolean;
	},
) {
	if (data.length === 0) return Promise.resolve([]);
	const authorIds = new Set(data.map((msg) => msg.authorId));

	// Todo: make one query for all of these
	if (!opts?.ignoreChecks) {
		const [ignoredAccounts, userServerSettings] = await Promise.all([
			findManyIgnoredDiscordAccountsById(Array.from(authorIds)),
			findManyUserServerSettings(
				data.map((msg) => ({
					userId: msg.authorId,
					serverId: msg.serverId,
				})),
			),
		]);
		const userServerSettingsLookup = new Map(
			userServerSettings.map((uss) => [`${uss.userId}-${uss.serverId}`, uss]),
		);

		const ignoredAccountIds = new Set(ignoredAccounts.map((i) => i.id));
		data = data.filter((msg) => {
			if (ignoredAccountIds.has(msg.authorId)) {
				return false;
			}
			if (
				userServerSettingsLookup.get(`${msg.authorId}-${msg.serverId}`)?.flags
					.messageIndexingDisabled
			) {
				return false;
			}
			return true;
		});
	}
	const chunkSize = 100;
	const chunks = [];
	for (let i = 0; i < data.length; i += chunkSize) {
		chunks.push(data.slice(i, i + chunkSize));
	}
	for await (const chunk of chunks) {
		await fastUpsertManyMessages(chunk);
	}
	return data;
}

export async function fastUpsertManyMessages(data: BaseMessageWithRelations[]) {
	const attachments = new Set<typeof dbAttachments.$inferInsert>();
	const emojis = new Set<typeof dbEmojis.$inferInsert>();
	const reactions = new Set<typeof dbReactions.$inferInsert>();
	const msgs = new Set<typeof dbMessages.$inferInsert>();
	for (const msg of data) {
		const { attachments: a, reactions: r, embeds: e, ...m } = msg;
		msgs.add({
			...messageSchema.parse(m),
			embeds: e,
		});
		if (a) {
			for (const attachment of a) {
				attachments.add(attachmentSchema.parse(attachment));
			}
		}
		if (r) {
			for (const reaction of r) {
				if (!reaction.emoji.id || !reaction.emoji.name) continue;
				emojis.add(emojiSchema.parse(reaction.emoji));
				reactions.add(reactionSchema.parse(reaction));
			}
		}
	}

	if (msgs.size > 0)
		await db
			.insert(dbMessages)
			.values(Array.from(msgs))
			.onDuplicateKeyUpdate({ set: { id: sql.raw('id') } });
	if (attachments.size > 0) {
		void db
			.select()
			.from(dbAttachments)
			.where(
				inArray(
					dbAttachments.id,
					[...attachments].map((a) => a.id),
				),
			)
			.then(async (existingAttachments) => {
				const existingAttachmentIds = new Set(
					existingAttachments.map((a) => a.id),
				);
				for await (const attachment of attachments) {
					if (!existingAttachmentIds.has(attachment.id)) {
						void uploadFileFromUrl({
							url: attachment.url,
							id: attachment.id,
							contentType: attachment.contentType ?? undefined,
							filename: attachment.filename,
						}).then(async (uploaded) => {
							if (!uploaded) return;
							await db.insert(dbAttachments).values(
								attachmentSchema.parse({
									...attachment,
									proxyUrl: `https://cdn.answeroverflow.com/${attachment.id}/${attachment.filename}`,
								}),
							);
						});
					}
				}
			});
	}
	if (emojis.size > 0)
		await db
			.insert(dbEmojis)
			.values(Array.from(emojis))
			.onDuplicateKeyUpdate({ set: { id: sql.raw('id') } });
	if (reactions.size > 0)
		await db
			.insert(dbReactions)
			.values(Array.from(reactions))
			.onDuplicateKeyUpdate({ set: { messageId: sql.raw('messageId') } });
}
