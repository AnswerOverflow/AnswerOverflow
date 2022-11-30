import { createContextInner } from "../context";
import { userServerSettingsRouter } from "./user_server_settings";
import { prisma } from "@answeroverflow/db";

// eslint-disable-next-line no-unused-vars
let user_server_settings_caller: ReturnType<typeof userServerSettingsRouter["createCaller"]>;
beforeEach(async () => {
  const a = await createContextInner({
    session: null,
  });
  await prisma.userServerSettings.deleteMany({});
  await prisma.userChannelSettings.deleteMany({});
  await prisma.serverSettings.deleteMany({});
  await prisma.channelSettings.deleteMany({});
  await prisma.channel.deleteMany({});
  await prisma.server.deleteMany({});
  await prisma.user.deleteMany({});
  user_server_settings_caller = userServerSettingsRouter.createCaller(a);
});

describe("userRouter", () => {
  it("should create user server settings", async () => {
    const missing_user_settings = await user_server_settings_caller.findById({
      user_id: "1",
      server_id: "1",
    });
    expect(missing_user_settings).toBeNull();
    const created_user_settings = await user_server_settings_caller.upsert({
      user: {
        name: "test",
        id: "1",
      },
      server: {
        name: "test",
        id: "1",
      },
      user_server_settings: {
        flags: {
          allowed_to_show_messages: true,
          message_indexing_disabled: false,
        },
      },
    });
    expect(created_user_settings).toBeDefined();
    expect(created_user_settings.user_id).toBe("1");
    expect(created_user_settings.server_id).toBe("1");
    expect(created_user_settings.bitfield).toBe(0);
  });
  it("should update user server settings", async () => {
    const missing_user_settings = await user_server_settings_caller.findById({
      user_id: "1",
      server_id: "1",
    });
    expect(missing_user_settings).toBeNull();
    const created_user_settings = await user_server_settings_caller.upsert({
      user: {
        name: "test",
        id: "1",
      },
      server: {
        name: "test",
        id: "1",
      },
      user_server_settings: {
        flags: {
          allowed_to_show_messages: true,
          message_indexing_disabled: false,
        },
      },
    });
    expect(created_user_settings).toBeDefined();
    expect(created_user_settings.user_id).toBe("1");
    expect(created_user_settings.server_id).toBe("1");
    expect(created_user_settings.bitfield).toBe(0);
    const updated_user_settings = await user_server_settings_caller.upsert({
      user: {
        name: "test",
        id: "1",
      },
      server: {
        name: "test",
        id: "1",
      },
      user_server_settings: {
        flags: {
          message_indexing_disabled: false,
          allowed_to_show_messages: true,
        },
      },
    });
    expect(updated_user_settings).toBeDefined();
    expect(updated_user_settings.user_id).toBe("1");
    expect(updated_user_settings.server_id).toBe("1");
    expect(updated_user_settings.bitfield).toBe(1);
  });
});
