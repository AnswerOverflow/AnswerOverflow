import { Client } from "@elastic/elasticsearch";
import { PrismaClient } from "@prisma/client";
import { ChannelManager } from "./features/channel/channel-manager";
import { ServerManager } from "./features/server/server-manager";
import { UserServerSettingsManager } from "./features/user-server-settings/user-server-settings-manager";
import { UserManager } from "./features/user/user-manager";

export class AnswerOverflowClient {
  public prisma: PrismaClient;
  public elastic: Client;
  public users: UserManager;
  public servers: ServerManager;
  public channels: ChannelManager;
  public user_server_settings: UserServerSettingsManager;
  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.VITE_DATABASE_URL,
        },
      },
    });
    this.users = new UserManager(this.prisma.user, this);
    this.servers = new ServerManager(this.prisma.server, this);
    this.user_server_settings = new UserServerSettingsManager(this.prisma.userServerSettings, this);
    this.channels = new ChannelManager(this.prisma.channel, this);
    this.elastic =
      process.env.NODE_ENV == "development"
        ? new Client({
            node: {
              url: new URL(process.env.VITE_ELASTIC_IP as string),
            },
            auth: {
              username: process.env.VITE_ELASTIC_USERNAME as string,
              password: process.env.VITE_ELASTIC_PASSWORD as string,
            },
          })
        : new Client({
            node: {
              url: new URL(process.env.VITE_ELASTIC_IP as string),
            },
            auth: {
              apiKey: process.env.ELASTIC_API_KEY as string,
            },
          });
  }
}

// if this is not here hot reloading breaks, I have no idea why
export class _ {}
