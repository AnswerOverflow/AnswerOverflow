/* eslint-disable @typescript-eslint/naming-convention */
import { createClient, login } from "./utils/bot";

const client = createClient();
void login(client);

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /* Discord Bot */
      DISCORD_TOKEN: string;
      INDEXING_INTERVAL_IN_HOURS: string | undefined;
      MAXIMUM_CHANNEL_MESSAGES_PER_INDEX: string | undefined;
      BOT_DEV_LOG_LEVEL: string | undefined;
      BOT_TEST_LOG_LEVEL: string | undefined;
      BOT_PROD_LOG_LEVEL: string | undefined;
    }
  }
}
