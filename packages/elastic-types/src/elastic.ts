import { Client, type ClientOptions, errors } from '@elastic/elasticsearch';
import type {
	BulkOperationContainer,
	QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { elasticMessageIndexProperties, type Message } from './message';
import { sharedEnvs } from '@answeroverflow/env/shared';
declare global {
	// eslint-disable-next-line no-var, no-unused-vars
	var elastic: Elastic | undefined;
}
const shouldRefreshIndexes = sharedEnvs.NODE_ENV === 'test';
export function getThreadIdOfMessage(message: Message): string | null {
	if (message.childThreadId) {
		return message.childThreadId;
	}
	if (message.parentChannelId) {
		return message.channelId;
	}
	return null;
}

export function getParentChannelOfMessage(message: Message): string | null {
	if (message.parentChannelId) {
		return message.parentChannelId;
	}
	return message.channelId;
}

export type MessageSearchOptions = {
	query: string;
	channelId?: string;
	serverId?: string;
	after?: string;
	limit?: number;
};

function getElasticClient(): Elastic {
	if (sharedEnvs.NODE_ENV === 'development' || sharedEnvs.NODE_ENV === 'test') {
		return new Elastic({
			node: sharedEnvs.ELASTICSEARCH_URL,
			auth: {
				password: sharedEnvs.ELASTICSEARCH_PASSWORD,
				username: sharedEnvs.ELASTICSEARCH_USERNAME,
			},
		});
	} else if (sharedEnvs.NODE_ENV === 'production') {
		// Allow for building locally
		if (!sharedEnvs.ELASTICSEARCH_CLOUD_ID) {
			return new Elastic({
				node: sharedEnvs.ELASTICSEARCH_URL,
				auth: {
					password: sharedEnvs.ELASTICSEARCH_PASSWORD,
					username: sharedEnvs.ELASTICSEARCH_USERNAME,
				},
			});
		} else {
			return new Elastic({
				cloud: {
					id: sharedEnvs.ELASTICSEARCH_CLOUD_ID,
				},
				auth: {
					password: sharedEnvs.ELASTICSEARCH_PASSWORD,
					username: sharedEnvs.ELASTICSEARCH_USERNAME,
				},
			});
		}
	} else {
		throw new Error('Invalid environment to connect to elastic');
	}
}

export class Elastic extends Client {
	messagesIndex: string;

	constructor(opts: ClientOptions) {
		super(opts);
		this.messagesIndex = sharedEnvs.ELASTICSEARCH_MESSAGE_INDEX;
	}

	public destroyMessagesIndex() {
		return this.indices.delete({
			index: this.messagesIndex,
		});
	}

	public async getMessage(id: string) {
		try {
			const message = await this.get<Message>({
				index: this.messagesIndex,
				id,
			});
			if (message.found === false) return null;
			return message._source ?? null;
		} catch (error) {
			if (error instanceof errors.ResponseError && error.statusCode === 404) {
				return null;
			} else {
				throw error;
			}
		}
	}

	public async bulkGetMessages(ids: string[]) {
		try {
			if (ids.length === 0) return Promise.resolve([]);
			const messages = await this.mget<Message>({
				docs: ids.map((id) => ({
					_index: this.messagesIndex,
					_id: id,
					_source: true,
				})),
			});
			return messages.docs
				.filter((doc) => 'found' in doc && doc.found)
				.map((doc) => {
					if (!('error' in doc) && doc._source) {
						return doc._source;
					} else throw new Error('Unknown error in bulk get messages');
				});
		} catch (error) {
			if (error instanceof errors.ResponseError && error.statusCode === 404) {
				return [];
			} else {
				throw error;
			}
		}
	}

	public async bulkGetMessagesByChannelId(
		channelId: string,
		after?: string,
		limit?: number,
	) {
		const result = await this.search<Message>({
			index: this.messagesIndex,
			query: {
				// TODO: Remove ts-expect-error
				// @ts-ignore
				bool: {
					must: [
						{
							term: {
								channelId,
							},
						},
						{
							range: {
								id: {
									gte: after ?? '0',
								},
							},
						},
					],
				},
			},
			size: limit ?? 100,
			sort: [{ id: 'asc' }],
		});

		return result.hits.hits
			.filter((hit) => hit._source)
			.map((hit) => hit._source!);
	}

	public async getAllMessages() {
		const body = {
			query: {
				match_all: {},
			},
		};
		const result = await this.search<Message>({
			index: this.messagesIndex,
			body,
			size: 1000,
			sort: [{ id: 'desc' }],
		});

		return result.hits.hits
			.filter((hit) => hit._source)
			.map((hit) => hit._source!);
	}

	public async deleteMessage(id: string) {
		try {
			const message = await this.delete({
				index: this.messagesIndex,
				id,
				refresh: shouldRefreshIndexes,
			});
			switch (message.result) {
				case 'deleted':
					return true;
				case 'not_found':
					return false;
				default:
					throw new Error('Unknown message delete error');
			}
		} catch (error) {
			if (error instanceof errors.ResponseError && error.statusCode === 404) {
				return false;
			} else {
				throw error;
			}
		}
	}

	public async deleteByChannelId(threadId: string) {
		const result = await this.deleteByQuery({
			index: this.messagesIndex,
			refresh: shouldRefreshIndexes,
			query: {
				term: {
					channelId: threadId,
				},
			},
		});
		return result.deleted;
	}

	public async deleteByUserId(userId: string) {
		const result = await this.deleteByQuery({
			index: this.messagesIndex,
			refresh: shouldRefreshIndexes,
			query: {
				term: {
					authorId: userId,
				},
			},
		});
		return result.deleted;
	}

	public async deleteByUserIdInServer({
		userId,
		serverId,
	}: {
		userId: string;
		serverId: string;
	}) {
		const result = await this.deleteByQuery({
			index: this.messagesIndex,
			refresh: shouldRefreshIndexes,
			query: {
				// @ts-ignore
				bool: {
					must: [
						{
							term: {
								authorId: userId,
							},
						},
						{
							term: {
								serverId,
							},
						},
					],
				},
			},
		});
		return result.deleted;
	}

	public async bulkDeleteMessages(ids: string[]) {
		if (ids.length === 0) return Promise.resolve(true);
		const body: BulkOperationContainer[] = ids.flatMap((id) => [
			{ delete: { _index: this.messagesIndex, _id: id } },
		]);
		const result = await this.bulk({
			operations: body,
			refresh: shouldRefreshIndexes,
		});
		if (result.errors) {
			console.error(result);
			return false;
		}
		return true;
	}

	public async updateMessage(message: Message) {
		try {
			const fetchedMessage = await this.update({
				index: this.messagesIndex,
				id: message.id,
				refresh: shouldRefreshIndexes,
				doc: message,
			});
			switch (fetchedMessage.result) {
				case 'updated':
				case 'noop': // Update changed no data
					return message;
				case 'not_found':
					throw new Error('Message not found when it should have been updated');
				case 'deleted':
					throw new Error('Message deleted when it should have been updated');
				default:
					throw new Error('Unknown message update error');
			}
		} catch (error) {
			if (error instanceof errors.ResponseError && error.statusCode === 404) {
				return null;
			} else {
				throw error;
			}
		}
	}

	public async upsertMessage(message: Message) {
		const fetchedMessage = await this.update({
			index: this.messagesIndex,
			id: message.id,
			doc: message,
			refresh: shouldRefreshIndexes,
			upsert: message,
		});
		switch (fetchedMessage.result) {
			case 'created':
			case 'updated':
			case 'noop': // Update changed no data
				return message;
			case 'not_found':
				throw new Error('Message not found when it should have been indexed');
			case 'deleted':
				throw new Error('Message deleted when it should have been indexed');
			default:
				throw new Error('Unknown message index error error');
		}
	}

	public async bulkUpsertMessages(messages: Message[]) {
		if (messages.length === 0) return true;
		const result = await this.bulk({
			operations: messages.flatMap((message) => [
				{ update: { _index: this.messagesIndex, _id: message.id } },
				{ doc: message, doc_as_upsert: true },
			]),
			refresh: sharedEnvs.NODE_ENV === 'test',
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
		const result = await this.search<Message>({
			index: this.messagesIndex,
			query: q,
			track_scores: true,
			// TODO: Enable highlighting
			// highlight: {
			//   fields: {
			//     content: {},
			//   },
			// },
			size: limit ?? 100,
			sort: '_score',
		});

		return result.hits.hits
			.filter((hit) => hit._source)
			.map((hit) => ({
				...hit,
				_source: hit._source!,
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

	public async findLatestMessageInChannel(channelId: string) {
		const result = await this.search<Message>({
			index: this.messagesIndex,
			query: {
				match: {
					channelId,
				},
			},
			size: 1,
			sort: [{ id: 'desc' }],
		});
		return result.hits.hits[0]?._source ?? null;
	}

	public async batchFindLatestMessageInChannel(channelIds: string[]) {
		const chunkSize = 5000;
		const batches = [];
		for (let i = 0; i < channelIds.length; i += chunkSize) {
			batches.push(channelIds.slice(i, i + chunkSize));
		}
		const results = await Promise.all(
			batches.map((batch) =>
				this.msearch<Message>({
					searches: batch
						.map((channelId) => {
							return [
								{
									index: this.messagesIndex,
								},
								{
									query: {
										match: {
											channelId,
										},
									},
									size: 1,
									sort: [{ id: 'desc' }],
								},
							];
						})
						.flatMap((x) => x),
				}),
			),
		);
		const res: Message[] = [];
		for (const result of results) {
			for (const hit of result.responses) {
				if ('error' in hit) continue;
				if (hit.hits.hits[0]?._source) {
					res.push(hit.hits.hits[0]._source);
				}
			}
		}
		return res;
	}

	public async findLatestMessageInChannelAndThreads(channelId: string) {
		const result = await this.search<Message>({
			index: this.messagesIndex,
			query: {
				multi_match: {
					query: channelId,
					fields: ['channelId', 'parentChannelId'],
				},
			},
			size: 1,
			sort: [{ id: 'desc' }],
		});
		return result.hits.hits[0]?._source ?? null;
	}

	public async getChannelMessagesCount(channelId: string) {
		const result = await this.count({
			index: this.messagesIndex,
			body: {
				query: {
					match: {
						channelId,
					},
				},
			},
		});
		return result.count;
	}

	public async getNumberOfIndexedMessages() {
		const result = await this.count({
			index: this.messagesIndex,
		});
		return result.count;
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
