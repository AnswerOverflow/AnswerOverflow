import { Client, ClientOptions, errors } from "@elastic/elasticsearch";

declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var elastic: Elastic | undefined;
}

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
export type Message = {
  id: string;
  serverId: string;
  channelId: string;
  authorId: string;
  content: string;
  images: {
    url: string;
    width: number | null;
    height: number | null;
    description: string | null;
  }[];
  repliesTo: string | null;
  childThread: string | null;
  solutions: string[];
};

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
    if (process.env.NODE_ENV === "test") {
      // TODO: Ugly hack for testing since elastic doesn't update immediately
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
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
    if (process.env.NODE_ENV === "test") {
      // TODO: Ugly hack for testing since elastic doesn't update immediately
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    const result = await this.deleteByQuery({
      index: this.messagesIndex,
      query: {
        term: {
          channelId: threadId,
        },
      },
    });
    return result.deleted;
  }

  public async bulkDeleteMessages(ids: string[]) {
    const body = ids.flatMap((id) => [{ delete: { Index: this.messagesIndex, Id: id } }]);
    const result = await this.bulk({ body });
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
    const body = messages.flatMap((message) => [
      { update: { Index: this.messagesIndex, Id: message.id } },
      { doc: message, docAsUpsert: true },
    ]);
    const result = await this.bulk({ body });
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
        properties: {
          id: { type: "long" },
          serverId: { type: "long" },
          channelId: { type: "long" },
          authorId: { type: "long" },
          hidden: { type: "boolean" },
          content: { type: "text" },
          repliesTo: { type: "long" },
          childThread: { type: "long" },
          images: {
            properties: {
              url: { type: "text" },
              width: { type: "integer" },
              height: { type: "integer" },
              description: { type: "text" },
            },
          },
        },
      },
    });
  }
}

export const elastic = global.elastic || getElasticClient();

if (process.env.NODE_ENV !== "production") {
  global.elastic = elastic;
}
