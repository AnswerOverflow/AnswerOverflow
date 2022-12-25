import { Client, ClientOptions, errors } from "@elastic/elasticsearch";

declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var elastic: Elastic | undefined;
}

function getElasticClient(): Elastic {
  if (process.env.NODE_ENV === "test") {
    if (!process.env.VITE_ELASTICSEARCH_URL) throw new Error("Missing elastic url");
    if (!process.env.VITE_ELASTICSEARCH_USERNAME) throw new Error("Missing elastic username");
    if (!process.env.VITE_ELASTICSEARCH_PASSWORD) throw new Error("Missing elastic password");
    return new Elastic({
      node: process.env.VITE_ELASTICSEARCH_URL,
      auth: {
        password: process.env.VITE_ELASTICSEARCH_PASSWORD,
        username: process.env.VITE_ELASTICSEARCH_USERNAME,
      },
    });
  } else if (process.env.NODE_ENV === "development") {
    if (!process.env.ELASTICSEARCH_URL) throw new Error("Missing elastic url");
    if (!process.env.ELASTICSEARCH_USERNAME) throw new Error("Missing elastic username");
    if (!process.env.ELASTICSEARCH_PASSWORD) throw new Error("Missing elastic password");
    return new Elastic({
      node: process.env.ELASTICSEARCH_URL,
      auth: {
        password: process.env.ELASTICSEARCH_PASSWORD,
        username: process.env.ELASTICSEARCH_USERNAME,
      },
    });
  } else if (process.env.NODE_ENV === "production") {
    if (!process.env.ELASTICSEARCH_CLOUD_ID) throw new Error("Missing elastic cloud id");
    if (!process.env.ELASTICSEARCH_API_KEY) throw new Error("Missing elastic api key");
    return new Elastic({
      cloud: {
        id: process.env.ELASTICSEARCH_CLOUD_ID,
      },
      auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY,
      },
    });
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
  images: string[];
  replies_to: string | null;
  thread_id: string | null;
  child_thread: string | null;
  solutions: string[];
};

export class Elastic extends Client {
  messages_index: string;

  constructor(opts: ClientOptions) {
    super(opts);
    if (process.env.NODE_ENV === "test") {
      if (process.env.VITE_ELASTICSEARCH_MESSAGE_INDEX === undefined)
        throw new Error("Missing elastic message index");
      this.messages_index = process.env.VITE_ELASTICSEARCH_MESSAGE_INDEX;
    } else {
      if (process.env.ELASTICSEARCH_MESSAGE_INDEX === undefined)
        throw new Error("Missing elastic message index");
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
          thread_id: { type: "long" },
          child_thread: { type: "long" },
          images: { type: "text" },
        },
      },
    });
  }
}

export const elastic = global.elastic || getElasticClient();

if (process.env.NODE_ENV !== "production") {
  global.elastic = elastic;
}
