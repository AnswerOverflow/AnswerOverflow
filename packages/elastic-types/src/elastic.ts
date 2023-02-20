import { Client, ClientOptions, errors } from "@elastic/elasticsearch";
import type {
  BulkOperationContainer,
  MappingProperty,
  QueryDslQueryContainer,
} from "@elastic/elasticsearch/lib/api/types";
import { z } from "zod";

declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var elastic: Elastic | undefined;
}

export const zDiscordImage = z.object({
  url: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  description: z.string().nullable(),
});

export const zMessageReference = z.object({
  messageId: z.string(),
  channelId: z.string(),
  serverId: z.string(),
});

export const zMessage = z.object({
  id: z.string(),
  content: z.string(),
  images: z.array(zDiscordImage),
  solutionIds: z.array(z.string()),
  messageReference: zMessageReference.nullable(),
  childThread: z.string().nullable(),
  authorId: z.string(),
  channelId: z.string(),
  serverId: z.string(),
});

export type MessageSearchOptions = {
  query: string;
  serverId?: string;
  after?: string;
  limit?: number;
};

type MessageImageMappingProperty = {
  [K in keyof typeof zDiscordImage.shape]: MappingProperty;
};

type MessageReferenceMappingProperty = {
  [K in keyof typeof zMessageReference.shape]: MappingProperty;
};

type ElasticMessageIndexProperties = {
  [K in keyof Message]: MappingProperty;
};

const idProperty: MappingProperty = { type: "long" };

const imageProperties: MessageImageMappingProperty = {
  url: { type: "text" },
  width: { type: "integer" },
  height: { type: "integer" },
  description: { type: "text" },
};

const messageReferenceProperties: MessageReferenceMappingProperty = {
  messageId: idProperty,
  channelId: idProperty,
  serverId: idProperty,
};

const properties: ElasticMessageIndexProperties = {
  id: idProperty,
  serverId: idProperty,
  channelId: idProperty,
  authorId: idProperty,
  content: { type: "text" },
  images: {
    properties: imageProperties,
  },
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/array.html
  solutionIds: idProperty,
  messageReference: {
    properties: messageReferenceProperties,
  },
  childThread: idProperty,
};

function getElasticClient(): Elastic {
  if (process.env.NODE_ENV === "test") {
    return new Elastic({
      node: process.env.VITE_ELASTICSEARCH_URL,
      auth: {
        password: process.env.VITE_ELASTICSEARCH_PASSWORD,
        username: process.env.VITE_ELASTICSEARCH_USERNAME,
      },
    });
  } else if (process.env.NODE_ENV === "development") {
    return new Elastic({
      node: process.env.ELASTICSEARCH_URL,
      auth: {
        password: process.env.ELASTICSEARCH_PASSWORD,
        username: process.env.ELASTICSEARCH_USERNAME,
      },
    });
  } else if (process.env.NODE_ENV === "production") {
    // Allow for building locally
    if (!process.env.ELASTICSEARCH_CLOUD_ID || !process.env.ELASTICSEARCH_API_KEY) {
      return new Elastic({
        node: process.env.ELASTICSEARCH_URL,
        auth: {
          password: process.env.ELASTICSEARCH_PASSWORD,
          username: process.env.ELASTICSEARCH_USERNAME,
        },
      });
    } else {
      return new Elastic({
        cloud: {
          id: process.env.ELASTICSEARCH_CLOUD_ID,
        },
        auth: {
          apiKey: process.env.ELASTICSEARCH_API_KEY,
        },
      });
    }
  } else {
    throw new Error("Invalid environment to connect to elastic");
  }
}

// https://discord.com/developers/docs/resources/channel#message-objects
export type Message = z.infer<typeof zMessage>;

export class Elastic extends Client {
  messagesIndex: string;

  constructor(opts: ClientOptions) {
    super(opts);
    if (process.env.NODE_ENV === "test") {
      this.messagesIndex = process.env.VITE_ELASTICSEARCH_MESSAGE_INDEX;
    } else {
      this.messagesIndex = process.env.ELASTICSEARCH_MESSAGE_INDEX;
    }
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
        docs: ids.map((id) => ({ _index: this.messagesIndex, _id: id, _source: true })),
      });
      return messages.docs
        .filter((doc) => "found" in doc && doc.found)
        .map((doc) => {
          if (!("error" in doc) && doc._source) {
            return doc._source;
          } else throw new Error("Unknown error in bulk get messages");
        });
    } catch (error) {
      if (error instanceof errors.ResponseError && error.statusCode === 404) {
        return [];
      } else {
        throw error;
      }
    }
  }

  public async bulkGetMessagesByChannelId(channelId: string, after?: string, limit?: number) {
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
                  gte: after ?? "0",
                },
              },
            },
          ],
        },
      },
      size: limit ?? 100,
      sort: [{ id: "asc" }],
    });

    return result.hits.hits.filter((hit) => hit._source).map((hit) => hit._source!);
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
      sort: [{ id: "desc" }],
    });

    return result.hits.hits.filter((hit) => hit._source).map((hit) => hit._source!);
  }

  public async deleteMessage(id: string) {
    try {
      const message = await this.delete({
        index: this.messagesIndex,
        id,
        refresh: process.env.NODE_ENV === "test",
      });
      switch (message.result) {
        case "deleted":
          return true;
        case "not_found":
          return false;
        default:
          throw new Error("Unknown message delete error");
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
      refresh: process.env.NODE_ENV === "test",
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
      refresh: process.env.NODE_ENV === "test",
      query: {
        term: {
          authorId: userId,
        },
      },
    });
    return result.deleted;
  }

  public async deleteByUserIdInServer({ userId, serverId }: { userId: string; serverId: string }) {
    const result = await this.deleteByQuery({
      index: this.messagesIndex,
      refresh: process.env.NODE_ENV === "test",
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
    const result = await this.bulk({ operations: body, refresh: process.env.NODE_ENV === "test" });
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
        refresh: process.env.NODE_ENV === "test",
        doc: message,
      });
      switch (fetchedMessage.result) {
        case "updated":
        case "noop": // Update changed no data
          return message;
        case "not_found":
          throw new Error("Message not found when it should have been updated");
        case "deleted":
          throw new Error("Message deleted when it should have been updated");
        default:
          throw new Error("Unknown message update error");
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
      refresh: process.env.NODE_ENV === "test",
      upsert: message,
    });
    switch (fetchedMessage.result) {
      case "created":
      case "updated":
      case "noop": // Update changed no data
        return message;
      case "not_found":
        throw new Error("Message not found when it should have been indexed");
      case "deleted":
        throw new Error("Message deleted when it should have been indexed");
      default:
        throw new Error("Unknown message index error error");
    }
  }

  public async bulkUpsertMessages(messages: Message[]) {
    if (messages.length === 0) return true;
    const result = await this.bulk({
      operations: messages.flatMap((message) => [
        { update: { _index: this.messagesIndex, _id: message.id } },
        { doc: message, doc_as_upsert: true },
      ]),
      refresh: process.env.NODE_ENV === "test",
    });
    if (result.errors) {
      console.error(
        result.errors,
        `Wrote ${result.took} successfully out of ${messages.length} messages`,
        result.items.map((item) => item.update?.error)
      );
      return false;
    }
    return true;
  }

  public async searchMessages({ query, serverId, limit }: MessageSearchOptions) {
    const q: QueryDslQueryContainer = {
      // TODO: No ts ignore in future
      // @ts-ignore
      bool: {
        must: [
          {
            multi_match: {
              query,
              fields: ["content"],
              fuzziness: "AUTO",
            },
          },
        ],
      },
    };
    if (!Array.isArray(q.bool?.must))
      throw new Error(
        "This error should never occur. The query is always expected to be an array for the must property"
      );
    if (q.bool?.must && serverId) {
      q.bool.must.push({
        match: {
          serverId,
        },
      });
    }
    const result = await this.search<Message>({
      index: this.messagesIndex,
      query: q,
      size: limit ?? 100,
      sort: [{ id: "asc" }],
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
      await this.destroyMessagesIndex();
    }
    return this.indices.create({
      index: "messages",
      mappings: {
        _source: {
          excludes: ["tags"],
        },
        properties,
      },
    });
  }
}

export const elastic = global.elastic || getElasticClient();

if (process.env.NODE_ENV !== "production") {
  global.elastic = elastic;
}
