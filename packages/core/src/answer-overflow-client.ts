import { Client } from "@elastic/elasticsearch";
import { PrismaClient } from "@prisma/client";
import { ServerManager } from "./features/server/manager";
import { UserManager } from "./features/user/manager";

export class AnswerOverflowClient {
  public prisma: PrismaClient;
  public elastic: Client;
  public users: UserManager;
  public servers: ServerManager;
  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.VITE_DATABASE_URL,
        },
      },
    });
    this.users = new UserManager(this.prisma.user);
    this.servers = new ServerManager(this.prisma.server);
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
