import type { GenericValidator } from "convex/values";
import { v } from "convex/values";
import { emojiSchema } from "../schema";

export const paginatedValidator = <T extends GenericValidator>(
	itemValidator: T,
) =>
	v.object({
		page: v.array(itemValidator),
		isDone: v.boolean(),
		continueCursor: v.string(),
	});

const forumTagFields = {
	id: v.int64(),
	name: v.string(),
	moderated: v.boolean(),
	emojiId: v.optional(v.int64()),
	emojiName: v.optional(v.string()),
};

const channelFields = {
	id: v.int64(),
	serverId: v.int64(),
	name: v.string(),
	type: v.number(),
	parentId: v.optional(v.int64()),
	archivedTimestamp: v.optional(v.number()),
	availableTags: v.optional(v.array(v.object(forumTagFields))),
	botPermissions: v.optional(v.union(v.string(), v.number())),
};

const serverFields = {
	discordId: v.int64(),
	name: v.string(),
	icon: v.optional(v.string()),
	banner: v.optional(v.string()),
	description: v.optional(v.string()),
	vanityInviteCode: v.optional(v.string()),
	kickedTime: v.optional(v.number()),
	approximateMemberCount: v.number(),
};

const embedFooterFields = {
	text: v.string(),
	iconUrl: v.optional(v.string()),
	proxyIconUrl: v.optional(v.string()),
	iconStorageId: v.optional(v.id("_storage")),
	iconS3Key: v.optional(v.string()),
};

const embedImageFields = {
	url: v.optional(v.string()),
	proxyUrl: v.optional(v.string()),
	height: v.optional(v.number()),
	width: v.optional(v.number()),
	storageId: v.optional(v.id("_storage")),
	s3Key: v.optional(v.string()),
};

const embedThumbnailFields = {
	url: v.optional(v.string()),
	proxyUrl: v.optional(v.string()),
	height: v.optional(v.number()),
	width: v.optional(v.number()),
	storageId: v.optional(v.id("_storage")),
	s3Key: v.optional(v.string()),
};

const embedVideoFields = {
	url: v.optional(v.string()),
	proxyUrl: v.optional(v.string()),
	height: v.optional(v.number()),
	width: v.optional(v.number()),
	storageId: v.optional(v.id("_storage")),
	s3Key: v.optional(v.string()),
};

const embedProviderFields = {
	name: v.optional(v.string()),
	url: v.optional(v.string()),
};

const embedAuthorFields = {
	name: v.optional(v.string()),
	url: v.optional(v.string()),
	iconUrl: v.optional(v.string()),
	proxyIconUrl: v.optional(v.string()),
	iconStorageId: v.optional(v.id("_storage")),
	iconS3Key: v.optional(v.string()),
};

const embedFieldFields = {
	name: v.string(),
	value: v.string(),
	inline: v.optional(v.boolean()),
};

const embedFields = {
	title: v.optional(v.string()),
	type: v.optional(v.string()),
	description: v.optional(v.string()),
	url: v.optional(v.string()),
	timestamp: v.optional(v.string()),
	color: v.optional(v.number()),
	footer: v.optional(v.object(embedFooterFields)),
	image: v.optional(v.object(embedImageFields)),
	thumbnail: v.optional(v.object(embedThumbnailFields)),
	video: v.optional(v.object(embedVideoFields)),
	provider: v.optional(v.object(embedProviderFields)),
	author: v.optional(v.object(embedAuthorFields)),
	fields: v.optional(v.array(v.object(embedFieldFields))),
};

const stickerFields = {
	id: v.int64(),
	name: v.string(),
	formatType: v.number(),
};

const messageFields = {
	id: v.int64(),
	authorId: v.int64(),
	serverId: v.int64(),
	channelId: v.int64(),
	parentChannelId: v.optional(v.int64()),
	childThreadId: v.optional(v.int64()),
	questionId: v.optional(v.int64()),
	referenceId: v.optional(v.int64()),
	applicationId: v.optional(v.int64()),
	interactionId: v.optional(v.int64()),
	webhookId: v.optional(v.int64()),
	content: v.string(),
	flags: v.optional(v.number()),
	type: v.optional(v.number()),
	pinned: v.optional(v.boolean()),
	nonce: v.optional(v.string()),
	tts: v.optional(v.boolean()),
	embeds: v.optional(v.array(v.object(embedFields))),
	stickers: v.optional(v.array(v.object(stickerFields))),
};

const attachmentFields = {
	id: v.int64(),
	messageId: v.int64(),
	contentType: v.optional(v.string()),
	filename: v.string(),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	size: v.number(),
	description: v.optional(v.string()),
	storageId: v.optional(v.id("_storage")),
};

export const channelWithSystemFieldsValidator = v.object({
	_id: v.id("channels"),
	_creationTime: v.number(),
	...channelFields,
});

const serverWithSystemFieldsValidator = v.object({
	_id: v.id("servers"),
	_creationTime: v.number(),
	...serverFields,
});

const messageWithSystemFieldsValidator = v.object({
	_id: v.id("messages"),
	_creationTime: v.number(),
	...messageFields,
});

const attachmentWithSystemFieldsValidator = v.object({
	_id: v.id("attachments"),
	_creationTime: v.number(),
	...attachmentFields,
});

const authorValidator = v.union(
	v.object({
		id: v.int64(),
		name: v.string(),
		avatar: v.optional(v.string()),
	}),
	v.null(),
);

const attachmentWithUrlValidator = attachmentWithSystemFieldsValidator.extend({
	url: v.string(),
});

const reactionWithEmojiValidator = v.object({
	userId: v.int64(),
	emoji: emojiSchema,
});

const metadataValidator = v.optional(
	v.object({
		users: v.optional(
			v.record(
				v.string(),
				v.object({
					username: v.string(),
					globalName: v.union(v.string(), v.null()),
					url: v.string(),
					exists: v.optional(v.boolean()),
				}),
			),
		),
		channels: v.optional(
			v.record(
				v.string(),
				v.object({
					name: v.string(),
					type: v.number(),
					url: v.string(),
					indexingEnabled: v.optional(v.boolean()),
					exists: v.optional(v.boolean()),
				}),
			),
		),
		internalLinks: v.optional(
			v.array(
				v.object({
					original: v.string(),
					guild: v.object({ id: v.int64(), name: v.string() }),
					channel: v.object({
						parent: v.optional(
							v.object({
								name: v.optional(v.string()),
								type: v.optional(v.number()),
								parentId: v.optional(v.int64()),
							}),
						),
						id: v.int64(),
						type: v.number(),
						name: v.string(),
						indexingEnabled: v.optional(v.boolean()),
					}),
					message: v.optional(v.int64()),
				}),
			),
		),
	}),
);

const baseEnrichedMessageValidator = v.object({
	message: messageWithSystemFieldsValidator,
	author: authorValidator,
	attachments: v.array(attachmentWithUrlValidator),
	reactions: v.array(reactionWithEmojiValidator),
	solutions: v.array(messageWithSystemFieldsValidator),
	metadata: metadataValidator,
});

export const enrichedMessageValidator = baseEnrichedMessageValidator.extend({
	reference: v.optional(
		v.union(
			v.object({
				messageId: v.int64(),
				message: v.union(baseEnrichedMessageValidator, v.null()),
			}),
			v.null(),
		),
	),
});

export const messageWithContextValidator = v.object({
	message: enrichedMessageValidator,
	channel: channelWithSystemFieldsValidator,
	server: serverWithSystemFieldsValidator,
	thread: v.optional(v.union(channelWithSystemFieldsValidator, v.null())),
});
