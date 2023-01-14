import { createClient, login } from "./utils/bot";
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
require("dotenv-mono").load();
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
