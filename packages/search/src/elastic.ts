import { Client, type ClientOptions } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { elasticMessageIndexProperties } from './schema';
declare global {
	// eslint-disable-next-line no-var, no-unused-vars
	var elastic: Elastic | undefined;
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
}

export const elastic = global.elastic || getElasticClient();

if (sharedEnvs.NODE_ENV !== 'production') {
	global.elastic = elastic;
} else {
	if (sharedEnvs.ENVIRONMENT === 'discord-bot') {
		global.elastic = elastic;
	}
}
