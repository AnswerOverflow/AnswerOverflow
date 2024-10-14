import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type {
	APIAttachment,
	APIEmbed,
	APIMessageReference,
} from 'discord-api-types/v10';
import type { CamelCasedPropertiesDeep } from 'type-fest';
import { z } from 'zod';

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

const zMessageReaction = z.object({
	emojiName: z.string().nullable().optional(),
	emojiId: z.string().nullable().optional(),
	reactorIds: z.array(z.string()),
});

const messageReactionProperties: CustomMappingProperty<
	z.infer<typeof zMessageReaction>
> = {
	reactorIds: idProperty,
	emojiId: idProperty,
	emojiName: { type: 'text' },
};

export const zMessage = z.object({
	id: z.string(),
	channelId: z.string(), // If the message is is in a thread, this is the thread's channel id
	authorId: z.string(),
	childThreadId: z.string().nullable(), // The thread started by this message
	parentChannelId: z.string().nullable(), // If the message is in a thread, this is the channel id of the parent channel for the thread
	serverId: z.string(),
	webhookId: z.string().nullable(),
	applicationId: z.string().nullable(),
	interactionId: z.string().nullable(),
	solutionIds: z.array(z.string()),

	content: z.string(),
	attachments: z.array(zDiscordAttachment),
	reactions: z.array(zMessageReaction),
	embeds: z.array(zDiscordEmbed),
	messageReference: zMessageReference.nullable(),

	tts: z.boolean(),
	nonce: z.string().nullable(),
	pinned: z.boolean(),
	type: z.number(),
	flags: z.number(),
});

// https://discord.com/developers/docs/resources/channel#message-objects
export type ElasticMessage = z.infer<typeof zMessage>;

type ElasticMessageIndexProperties = {
	[K in keyof ElasticMessage]: MappingProperty;
};

const elasticMessageIndexProperties: ElasticMessageIndexProperties = {
	id: idProperty,
	serverId: idProperty,
	channelId: idProperty,
	authorId: idProperty,
	parentChannelId: idProperty,
	childThreadId: idProperty,
	applicationId: idProperty,
	interactionId: idProperty,
	webhookId: idProperty,
	solutionIds: idProperty,
	content: { type: 'text' },
	flags: { type: 'integer' },
	type: { type: 'integer' },
	pinned: { type: 'boolean' },
	nonce: { type: 'text' },
	tts: { type: 'boolean' },

	attachments: {
		properties: attachmentProperties,
	},
	embeds: {
		properties: embedProperties,
	},
	reactions: {
		properties: messageReactionProperties,
	},
	messageReference: {
		properties: messageReferenceProperties,
	},
};

import { sharedEnvs } from '@answeroverflow/env/shared';
// import { Client, type ClientOptions } from '@elastic/elasticsearch';
import {
	ClientOptions,
	Client as ElasticClient,
	HttpConnection,
} from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { findManyChannelsById } from './channel';
import { MessageFull, findManyMessagesWithAuthors } from './message';
import { BaseMessageWithRelations } from './schema';
import { findManyServersById } from './server';
import { ChannelWithFlags, ServerWithFlags } from './zod';

declare global {
	// eslint-disable-next-line no-var, no-unused-vars
	var elastic: Elastic | undefined;
}

function getElasticClient(): Elastic {
	if (sharedEnvs.NODE_ENV === 'development' || sharedEnvs.NODE_ENV === 'test') {
		return new Elastic({
			node: sharedEnvs.ELASTICSEARCH_URL,
			Connection: HttpConnection,
			auth: {
				password: sharedEnvs.ELASTICSEARCH_PASSWORD!,
				username: sharedEnvs.ELASTICSEARCH_USERNAME!,
			},
		});
	} else if (sharedEnvs.NODE_ENV === 'production') {
		// Allow for building locally
		if (!sharedEnvs.ELASTICSEARCH_CLOUD_ID) {
			return new Elastic({
				node: sharedEnvs.ELASTICSEARCH_URL,
				Connection: HttpConnection,
				auth: {
					password: sharedEnvs.ELASTICSEARCH_PASSWORD!,
					username: sharedEnvs.ELASTICSEARCH_USERNAME!,
				},
			});
		} else {
			return new Elastic({
				cloud: {
					id: sharedEnvs.ELASTICSEARCH_CLOUD_ID,
				},
				Connection: HttpConnection,
				auth: {
					password: sharedEnvs.ELASTICSEARCH_PASSWORD!,
					username: sharedEnvs.ELASTICSEARCH_USERNAME!,
				},
			});
		}
	} else {
		throw new Error('Invalid environment to connect to elastic');
	}
}

export class Elastic extends ElasticClient {
	messagesIndex: string;

	constructor(opts: ClientOptions) {
		super(opts);
		this.messagesIndex = sharedEnvs.ELASTICSEARCH_MESSAGE_INDEX!;
	}

	public destroyMessagesIndex() {
		return this.indices.delete({
			index: this.messagesIndex,
		});
	}

	public async searchMessages({
		query,
		serverId,
		limit,
		channelId,
	}: MessageSearchOptions) {
		const q: QueryDslQueryContainer = {
			// TODO: No ts ignore in future
			// @ts-ignore
			bool: {
				must: [
					{
						multi_match: {
							query,
							fields: ['content'],
							fuzziness: 'AUTO',
						},
					},
				],
			},
		};
		if (!Array.isArray(q.bool?.must))
			throw new Error(
				'This error should never occur. The query is always expected to be an array for the must property',
			);
		if (q.bool?.must) {
			if (serverId) {
				q.bool.must.push({
					match: {
						serverId,
					},
				});
			}
			if (channelId) {
				q.bool.must.push({
					match: {
						channelId,
					},
				});
			}
		}
		const result = await this.search({
			index: this.messagesIndex,
			query: q,
			track_scores: true,
			size: limit ?? 100,
			sort: '_score',
		});

		return result.hits.hits
			.filter((hit) => hit._source)
			.map((hit) => ({
				id: hit._id,
				score: hit._score,
			}));
	}

	public async createMessagesIndex() {
		const exists = await this.indices.exists({
			index: this.messagesIndex,
		});
		if (exists) {
			if (sharedEnvs.NODE_ENV === 'production') {
				throw new Error('Messages index already exists. Cannot overwrite');
			} else {
				await this.destroyMessagesIndex();
			}
		}
		return this.indices.create({
			index: this.messagesIndex,
			mappings: {
				_source: {
					excludes: ['tags'],
				},
				properties: elasticMessageIndexProperties,
			},
		});
	}

	public async bulkUpsertMessages(messages: ElasticMessage[]) {
		if (messages.length === 0) return true;
		const result = await this.bulk({
			operations: messages.flatMap((message) => [
				{ update: { _index: this.messagesIndex, _id: message.id } },
				{ doc: message, doc_as_upsert: true },
			]),
			refresh: sharedEnvs.NODE_ENV !== 'production',
		});
		if (result.errors) {
			console.error(
				result.errors,
				`Wrote ${result.took} successfully out of ${messages.length} messages`,
				result.items.map((item) => item.update?.error),
			);
			return false;
		}
		return true;
	}
}

export const elastic = global.elastic || getElasticClient();

if (sharedEnvs.NODE_ENV !== 'production') {
	global.elastic = elastic;
} else {
	if (sharedEnvs.ENVIRONMENT === 'discord-bot') {
		global.elastic = elastic;
	}
}

export type SearchResult = {
	message: MessageFull;
	score: number;
	channel: ChannelWithFlags;
	server: ServerWithFlags;
	thread?: ChannelWithFlags;
};
export type MessageSearchOptions = {
	query: string;
	channelId?: string;
	serverId?: string;
	after?: string;
	limit?: number;
};
export namespace Search {
	export async function searchMessages(opts: MessageSearchOptions) {
		const results = await elastic.searchMessages(opts);
		const messagesWithAuthors = await findManyMessagesWithAuthors(
			results.map((r) => r.id!),
		);
		// TODO: Include w/ query above
		const [servers, channels] = await Promise.all([
			findManyServersById(messagesWithAuthors.map((m) => m.serverId)),
			findManyChannelsById(
				messagesWithAuthors.flatMap((m) =>
					m.parentChannelId ? [m.channelId, m.parentChannelId] : [m.channelId],
				),
			),
		]);
		const serverLookup = new Map(servers.map((s) => [s.id, s]));
		const channelLookup = new Map(channels.map((c) => [c.id, c]));
		const resultsLookup = new Map(results.map((r) => [r.id, r]));

		return messagesWithAuthors
			.map((m): SearchResult | null => {
				const channel = channelLookup.get(m.parentChannelId ?? m.channelId);
				const server = serverLookup.get(m.serverId);
				const thread = m.parentChannelId
					? channelLookup.get(m.channelId)
					: undefined;
				if (!channel || !server) {
					return null;
				}
				if (!channel.flags.indexingEnabled) {
					return null;
				}
				return {
					message: m,
					channel,
					score: resultsLookup.get(m.id)!.score ?? 0,
					server: server,
					thread,
				};
			})
			.filter((res) => res != null && res.server.kickedTime === null)
			.sort((a, b) => b!.score - a!.score) as SearchResult[];
	}

	export function indexMessageForSearch(messages: BaseMessageWithRelations[]) {
		return elastic.bulkUpsertMessages(
			messages.map((m) => ({
				...m,
				embeds: [],
				attachments: [],
				reactions: [],
				solutionIds: [],
				messageReference: null,
				flags: 0,
				type: 0,
				pinned: false,
				tts: false,
			})),
		);
	}
}
