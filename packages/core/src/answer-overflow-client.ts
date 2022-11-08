import { Client } from "@elastic/elasticsearch";
import { PrismaClient } from "@prisma/client";
import { ServerManager } from "./managers/servers/server-manager";
import { UserServerSettingsManager } from "./managers/user-server-settings/user-server-settings-manager";
import { UserManager } from "./managers/users/user-manager";

export class AnswerOverflowClient {
  public users = new UserManager(this);
  public servers = new ServerManager(this);
  public user_server_settings = new UserServerSettingsManager(this);
  public prisma = new PrismaClient();
  public elastic =
    process.env.NODE_ENV == "development"
      ? new Client({
          node: process.env.ELASTIC_IP,
          auth: {
            username: process.env.ELASTIC_USERNAME as string,
            password: process.env.ELASTIC_PASSWORD as string,
          },
        })
      : new Client({
          node: process.env.ELASTIC_IP,
          auth: {
            apiKey: process.env.ELASTIC_API_KEY as string,
          },
        });
}

// if this is not here hot reloading breaks, I have no idea why
export class _ {}
