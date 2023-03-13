import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { z } from 'zod';
import type {
	APIAttachment,
	APIEmbed,
	APIMessageComponent,
	APIMessageReference,
	APISelectMenuOption,
} from 'discord-api-types/v10';
import type { CamelCasedPropertiesDeep } from 'type-fest';

const idProperty: MappingProperty = { type: 'long' };

type CustomMappingProperty<T> = {
	[K in keyof T]: MappingProperty;
};

export const zDiscordAttachment: z.ZodType<
	CamelCasedPropertiesDeep<APIAttachment>
> = z.any();

const attachmentProperties: CustomMappingProperty<
	z.infer<typeof zDiscordAttachment>
> = {
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

type CamelCaseEmbed = CamelCasedPropertiesDeep<APIEmbed>;

export const zDiscordEmbed: z.ZodType<CamelCaseEmbed> = z.any();

const embedAuthorProperties: CustomMappingProperty<CamelCaseEmbed['author']> = {
	name: { type: 'text' },
	iconUrl: { type: 'text' },
	proxyIconUrl: { type: 'text' },
	url: { type: 'text' },
};

const embedFooterProperties: CustomMappingProperty<CamelCaseEmbed['footer']> = {
	text: { type: 'text' },
	iconUrl: { type: 'text' },
	proxyIconUrl: { type: 'text' },
};

const embedFieldProperties: CustomMappingProperty<
	NonNullable<CamelCaseEmbed['fields']>[number]
> = {
	name: { type: 'text' },
	value: { type: 'text' },
	inline: { type: 'boolean' },
};

const embedImageProperties: CustomMappingProperty<
	NonNullable<CamelCaseEmbed['image']>
> = {
	url: { type: 'text' },
	proxyUrl: { type: 'text' },
	height: { type: 'integer' },
	width: { type: 'integer' },
};

const embedProviderProperties: CustomMappingProperty<
	NonNullable<CamelCaseEmbed['provider']>
> = {
	name: { type: 'text' },
	url: { type: 'text' },
};

const embedThumbnailProperties: CustomMappingProperty<
	NonNullable<CamelCaseEmbed['thumbnail']>
> = {
	url: { type: 'text' },
	proxyUrl: { type: 'text' },
	height: { type: 'integer' },
	width: { type: 'integer' },
};

const embedVideoProperties: CustomMappingProperty<
	NonNullable<CamelCaseEmbed['video']>
> = {
	url: { type: 'text' },
	height: { type: 'integer' },
	width: { type: 'integer' },
};

const embedProperties: CustomMappingProperty<z.infer<typeof zDiscordEmbed>> = {
	title: { type: 'text' },
	color: { type: 'integer' },
	description: { type: 'text' },
	author: {
		properties: embedAuthorProperties,
	},
	fields: {
		properties: embedFieldProperties,
	},
	footer: {
		properties: embedFooterProperties,
	},
	image: {
		properties: embedImageProperties,
	},
	provider: {
		properties: embedProviderProperties,
	},
	thumbnail: {
		properties: embedThumbnailProperties,
	},
	timestamp: { type: 'date' },
	type: { type: 'text' },
	video: {
		properties: embedVideoProperties,
	},
	url: { type: 'text' },
};

export const zMessageReference: z.ZodType<
	CamelCasedPropertiesDeep<
		Omit<APIMessageReference, 'guild_id'> & {
			serverId: string;
		}
	>
> = z.any();

type MessageReferenceMappingProperty = CustomMappingProperty<
	z.infer<typeof zMessageReference>
>;

const messageReferenceProperties: MessageReferenceMappingProperty = {
	messageId: idProperty,
	channelId: idProperty,
	serverId: idProperty,
};

export const zDiscordMessageComponent: z.ZodType<
	CamelCasedPropertiesDeep<APIMessageComponent>
> = z.any();
const selectOptionsProperties: CustomMappingProperty<APISelectMenuOption> = {
	label: { type: 'text' },
	value: { type: 'text' },
	default: { type: 'boolean' },
	description: { type: 'text' },
	emoji: { type: 'text' },
};

const baseMessageComponentProperties: CustomMappingProperty<
	z.infer<typeof zDiscordMessageComponent>
> = {
	type: { type: 'integer' },
	url: { type: 'text' },
	style: { type: 'integer' },
	options: { properties: selectOptionsProperties },
	disabled: { type: 'boolean' },
	maxValues: { type: 'integer' },
	minValues: { type: 'integer' },
	placeholder: { type: 'text' },
	emoji: { type: 'text' },
	label: { type: 'text' },
	customId: { type: 'text' },
	channelTypes: { type: 'integer' },
};

const messageComponentProperties: CustomMappingProperty<
	z.infer<typeof zDiscordMessageComponent>
> = {
	...baseMessageComponentProperties,
	components: {
		properties: baseMessageComponentProperties,
	},
};

export const zMessage = z.object({
	id: z.string(),
	channelId: z.string(), // If the message is is in a thread, this is the thread's channel id
	authorId: z.string(),
	childThreadId: z.string().nullable(), // The thread started by this message
	parentChannelId: z.string().nullable(), // If the message is in a thread, this is the channel id of the parent channel for the thread
	serverId: z.string(),
	stickerIds: z.array(z.string()),
	webhookId: z.string().nullable(),
	applicationId: z.string().nullable(),
	interactionId: z.string().nullable(),
	solutionIds: z.array(z.string()),

	content: z.string(),
	attachments: z.array(zDiscordAttachment),
	components: z.array(zDiscordMessageComponent),
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
	flags: z.number(),
});

// https://discord.com/developers/docs/resources/channel#message-objects
export type Message = z.infer<typeof zMessage>;

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
	mentions: idProperty,
	mentionRoles: idProperty,
	mentionChannels: idProperty,

	content: { type: 'text' },
	flags: { type: 'integer' },
	type: { type: 'integer' },
	pinned: { type: 'boolean' },
	nonce: { type: 'text' },
	tts: { type: 'boolean' },
	mentionEveryone: { type: 'boolean' },
	attachments: {
		properties: attachmentProperties,
	},
	embeds: {
		properties: embedProperties,
	},
	components: {
		properties: messageComponentProperties,
	},
	// https://www.elastic.co/guide/en/elasticsearch/reference/current/array.html
	messageReference: {
		properties: messageReferenceProperties,
	},
};
