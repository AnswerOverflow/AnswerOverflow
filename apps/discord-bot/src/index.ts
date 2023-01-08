import { createClient, login } from "./utils/bot";
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
require("dotenv-mono").load();
const client = createClient();
void login(client);

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace NodeJS {
    // eslint-disable-next-line no-unused-vars
    interface ProcessEnv {
      /* Discord Bot */
      DISCORD_TOKEN: string;
    }
  }
}
