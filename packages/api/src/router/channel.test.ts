import { botRouter } from ".";
import { clearDatabase } from "../../test/utils";
import { createContextInner } from "../context";

// eslint-disable-next-line no-unused-vars
let router: ReturnType<typeof botRouter["createCaller"]>;

beforeEach(async () => {
  const a = await createContextInner({
    session: null,
    caller: "discord-bot",
    user_servers: null,
  });
  router = botRouter.createCaller(a);
  await clearDatabase();
});

describe("channelRouter", () => {});
