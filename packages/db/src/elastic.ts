import { Client, ClientOptions } from "@elastic/elasticsearch";

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
  channel_id: string;
  guild_id?: string;
  author_id: string;
  author_type: number;
  type: number;
  mentions: string[];
  mention_everyone: boolean;
  content: string;
  has: number;
  link_hostnames: string[];
  embed_providers: string[];
  embed_types: string[];
  attachment_extensions: string[];
  attachment_filenames: string[];
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

  public getMessage(id: string) {
    return this.get({
      index: this.messages_index,
      id,
    });
  }

  public indexMessage(message: Message) {
    return this.update({
      index: this.messages_index,
      id: message.id,
      doc: message,
      upsert: message,
    });
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
          id: {
            type: "long",
          },
          channel_id: {
            type: "long",
          },
          guild_id: {
            type: "long",
          },
          author_id: {
            type: "long",
          },
          author_type: {
            type: "byte",
          },
          type: {
            type: "short",
          },
          mentions: {
            type: "long",
          },
          mention_everyone: {
            type: "boolean",
          },
          content: {
            type: "text",
            fields: {
              lang_analyzed: {
                type: "text",
                analyzer: "english",
              },
            },
          },
          has: {
            type: "short",
          },
          link_hostnames: {
            type: "keyword",
          },
          embed_providers: {
            type: "keyword",
          },
          embed_types: {
            type: "keyword",
          },
          attachment_extensions: {
            type: "keyword",
          },
          attachment_filenames: {
            type: "text",
            analyzer: "simple",
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
