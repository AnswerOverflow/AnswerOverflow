import type { GenericValidator } from "convex/values";
import { v } from "convex/values";
import {
	attachmentSchema,
	channelSchema,
	emojiSchema,
	messageSchema,
	serverSchema,
} from "../schema";

export const paginatedValidator = <T extends GenericValidator>(
	itemValidator: T,
) =>
	v.object({
		page: v.array(itemValidator),
		isDone: v.boolean(),
		continueCursor: v.string(),
	});

export const channelWithSystemFieldsValidator = v.object({
	_id: v.id("channels"),
	_creationTime: v.number(),
	...channelSchema.fields,
});

const serverWithSystemFieldsValidator = v.object({
	_id: v.id("servers"),
	_creationTime: v.number(),
	...serverSchema.fields,
});

const messageWithSystemFieldsValidator = v.object({
	_id: v.id("messages"),
	_creationTime: v.number(),
	...messageSchema.fields,
});

const attachmentWithSystemFieldsValidator = v.object({
	_id: v.id("attachments"),
	_creationTime: v.number(),
	...attachmentSchema.fields,
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
