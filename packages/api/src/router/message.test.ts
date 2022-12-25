import { clearDatabase, Message } from "@answeroverflow/db";
import { getGeneralScenario, ServerTestData } from "../test/utils";
import { messageRouter } from "./message";

let data: ServerTestData;
let messages_router: ReturnType<typeof messageRouter["createCaller"]>;
let message: Message;
beforeEach(async () => {
  const { data: server_data, manage_guild_ctx } = await getGeneralScenario();
  data = server_data;
  message = data.channels[0].messages[0];
  messages_router = messageRouter.createCaller(manage_guild_ctx);
  await clearDatabase();
});

describe("Message Create", () => {
  it("should create a message", async () => {
    const created = await messages_router.upsert(message);
    expect(created).toBeDefined();
  });
});
