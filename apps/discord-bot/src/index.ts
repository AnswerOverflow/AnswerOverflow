import { createClient, login } from "./utils/bot";
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
require("dotenv-mono").load();
const client = createClient();
void login(client);
