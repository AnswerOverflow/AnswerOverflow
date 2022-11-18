import { Client } from "@elastic/elasticsearch";
import { PrismaClient } from "@prisma/client";
import { Cache } from "./primitives/manager";
import { User_Manager } from "./features/user/manager";
import { User_Extended } from "./features/user/data";

export class AnswerOverflowClient {
  public users = new User_Manager(this, new Cache<User_Extended>());
  //public servers = new ServerManager(this);
  //public user_server_settings = new UserServerSettingsManager(this);
  //public channel_settings = new ChannelSettingsManager(this, new Cache<ChannelSettings_Extended>());
  public prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.VITE_DATABASE_URL,
      },
    },
  });
  public elastic =
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

// if this is not here hot reloading breaks, I have no idea why
export class _ {}
