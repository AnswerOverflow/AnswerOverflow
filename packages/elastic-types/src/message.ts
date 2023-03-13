import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { z } from 'zod';

export const zDiscordAttachment = z.object({
	id: z.string(),
	filename: z.string(),
	description: z.string().nullable(),
	contentType: z.string(),
	size: z.number(),
	url: z.string(),
	proxyUrl: z.string(),
	height: z.number().nullable(),
	width: z.number().nullable(),
});

export const zDiscordEmbedFooter = z.object({
	text: z.string(),
	iconUrl: z.string().nullable(),
	proxyIconUrl: z.string().nullable(),
});

export const zDiscordEmbedImage = z.object({
	url: z.string().nullable(),
	proxyUrl: z.string().nullable(),
	height: z.number().nullable(),
	width: z.number().nullable(),
});

export const zDiscordEmbedThumbnail = z.object({
	url: z.string().nullable(),
	proxyUrl: z.string().nullable(),
	height: z.number().nullable(),
	width: z.number().nullable(),
});

export const zDiscordEmbedVideo = z.object({
	url: z.string().nullable(),
	proxyUrl: z.string().nullable(),
	height: z.number().nullable(),
	width: z.number().nullable(),
});

export const zDiscordEmbedProvider = z.object({
	name: z.string().nullable(),
	url: z.string().nullable(),
});

export const zDiscordEmbedAuthor = z.object({
	name: z.string(),
	url: z.string().nullable(),
	iconUrl: z.string().nullable(),
	proxyIconUrl: z.string().nullable(),
});

export const zEmbedField = z.object({
	name: z.string(),
	value: z.string(),
	inline: z.boolean(),
});

export const zDiscordEmbed = z.object({
	title: z.string().nullable(),
	type: z.string().nullable(),
	description: z.string().nullable(),
	url: z.string().nullable(),
	timestamp: z.string().nullable(),
	color: z.number().nullable(),
	footer: zDiscordEmbedFooter.nullable(),
	image: zDiscordEmbedImage.nullable(),
	thumbnail: zDiscordEmbedThumbnail.nullable(),
	video: zDiscordEmbedVideo.nullable(),
	provider: zDiscordEmbedProvider.nullable(),
	author: zDiscordEmbedAuthor.nullable(),
	fields: z.array(zEmbedField),
});

export const zMessageReference = z.object({
	messageId: z.string(),
	channelId: z.string(),
	serverId: z.string(),
});

export const zMessage = z.object({
	id: z.string(),
	channelId: z.string(), // If the message is is in a thread, this is the thread's channel id
	authorId: z.string(),
	childThreadId: z.string().nullable(), // The thread started by this message
	parentChannelId: z.string().nullable(), // If the message is in a thread, this is the channel id of the parent channel for the thread
	serverId: z.string(),
	stickerIds: z.array(z.string()),
	solutionIds: z.array(z.string()),
	webhookId: z.string().nullable(),
	applicationId: z.string().nullable(),
	interactionId: z.string().nullable(),

	content: z.string(),
	attachments: z.array(zDiscordAttachment),
	components: z.array(z.string()),
	embeds: z.array(zDiscordEmbed),
	messageReference: zMessageReference.nullable(),

	tts: z.boolean(),
	mentionEveryone: z.boolean(),
	mentionRoles: z.array(z.string()), // List of role ids mentioned in the message
	mentions: z.array(z.string()), // List of user ids mentioned in the message
	mentionChannels: z.array(z.string()), // List of channel ids mentioned in the message
	nonce: z.string().nullable(),
	pinned: z.boolean(),
	type: z.number(),
	activity: z.string().nullable(),
	flags: z.number(),
});

// https://discord.com/developers/docs/resources/channel#message-objects
export type Message = z.infer<typeof zMessage>;

const idProperty: MappingProperty = { type: 'long' };

type MessageAttachmentProperty = {
	[K in keyof typeof zDiscordAttachment.shape]: MappingProperty;
};

const attachmentProperties: MessageAttachmentProperty = {
	id: idProperty,
	contentType: { type: 'text' },
	filename: { type: 'text' },
	proxyUrl: { type: 'text' },
	url: { type: 'text' },
	width: { type: 'integer' },
	height: { type: 'integer' },
	size: { type: 'integer' },
	description: { type: 'text' },
};

type MessageReferenceMappingProperty = {
	[K in keyof typeof zMessageReference.shape]: MappingProperty;
};

const messageReferenceProperties: MessageReferenceMappingProperty = {
	messageId: idProperty,
	channelId: idProperty,
	serverId: idProperty,
};

type ElasticMessageIndexProperties = {
	[K in keyof Message]: MappingProperty;
};

export const elasticMessageIndexProperties: ElasticMessageIndexProperties = {
	id: idProperty,
	serverId: idProperty,
	channelId: idProperty,
	authorId: idProperty,
	parentChannelId: idProperty,
	childThreadId: idProperty,
	applicationId: idProperty,
	interactionId: idProperty,
	stickerIds: idProperty,
	webhookId: idProperty,
	solutionIds: idProperty,

	content: { type: 'text' },
	attachments: {
		properties: attachmentProperties,
	},

	// https://www.elastic.co/guide/en/elasticsearch/reference/current/array.html
	messageReference: {
		properties: messageReferenceProperties,
	},
};
