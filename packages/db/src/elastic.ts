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
  server_id: string;
  channel_id: string;
  author_id: string;
  content: string;
  images: {
    url: string;
    width: number | null;
    height: number | null;
    description: string | null;
  }[];
  replies_to: string | null;
  child_thread: string | null;
  solutions: string[];
};

export class Elastic extends Client {
  messages_index: string;

  constructor(opts: ClientOptions) {
    super(opts);
    if (process.env.NODE_ENV === "test") {
      this.messages_index = process.env.VITE_ELASTICSEARCH_MESSAGE_INDEX;
    } else {
      this.messages_index = process.env.ELASTICSEARCH_MESSAGE_INDEX;
    }
  }

  public destroyMessagesIndex() {
    return this.indices.delete({
      index: this.messages_index,
    });
  }

  public async getMessage(id: string) {
    try {
      const message = await this.get<Message>({
        index: this.messages_index,
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
        docs: ids.map((id) => ({ _index: this.messages_index, _id: id, _source: true })),
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

  public async bulkGetMessagesByChannelId(channel_id: string, after?: string, limit?: number) {
    if (process.env.NODE_ENV === "test") {
      // TODO: Ugly hack for testing since elastic doesn't update immediately
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    const result = await this.search<Message>({
      index: this.messages_index,
      query: {
        // TODO: Remove ts-expect-error
        // @ts-expect-error
        bool: {
          must: [
            {
              term: {
                channel_id,
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
      index: this.messages_index,
      body,
      size: 1000,
      sort: [{ id: "desc" }],
    });

    return result.hits.hits.filter((hit) => hit._source).map((hit) => hit._source!);
  }

  public async deleteMessage(id: string) {
    try {
      const message = await this.delete({
        index: this.messages_index,
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

  public async deleteByChannelId(thread_id: string) {
    if (process.env.NODE_ENV === "test") {
      // TODO: Ugly hack for testing since elastic doesn't update immediately
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    const result = await this.deleteByQuery({
      index: this.messages_index,
      query: {
        term: {
          channel_id: thread_id,
        },
      },
    });
    return result.deleted;
  }

  public async bulkDeleteMessages(ids: string[]) {
    const body = ids.flatMap((id) => [{ delete: { _index: this.messages_index, _id: id } }]);
    const result = await this.bulk({ body });
    if (result.errors) {
      console.error(result);
      return false;
    }
    return true;
  }

  public async updateMessage(message: Message) {
    try {
      const fetched_message = await this.update({
        index: this.messages_index,
        id: message.id,
        doc: message,
      });
      switch (fetched_message.result) {
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
    const fetched_message = await this.update({
      index: this.messages_index,
      id: message.id,
      doc: message,
      upsert: message,
    });
    switch (fetched_message.result) {
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
      { update: { _index: this.messages_index, _id: message.id } },
      { doc: message, doc_as_upsert: true },
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
      index: this.messages_index,
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
          server_id: { type: "long" },
          channel_id: { type: "long" },
          author_id: { type: "long" },
          hidden: { type: "boolean" },
          content: { type: "text" },
          replies_to: { type: "long" },
          child_thread: { type: "long" },
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
