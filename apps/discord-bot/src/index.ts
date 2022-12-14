import "~utils/setup";
import { createClient, login } from "./utils/bot";

const client = createClient();
void login(client);
