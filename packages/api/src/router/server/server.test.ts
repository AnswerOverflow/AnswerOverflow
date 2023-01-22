import { clearDatabase, Server } from "@answeroverflow/db";
import {
  createAnswerOverflowBotCtx,
  mockAccountWithServersCallerCtx,
  mockServer,
  testAllDataVariants,
  testAllVariantsThatThrowErrors,
} from "~api/test/utils";
import { MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE } from "~api/utils/permissions";
import { pick } from "~api/utils/utils";
import { serverRouter } from "./server";

let answer_overflow_bot_router: ReturnType<(typeof serverRouter)["createCaller"]>;
let server_1: Server;
beforeEach(async () => {
  await clearDatabase();
  server_1 = mockServer();
  const ao_bot = await createAnswerOverflowBotCtx();
  answer_overflow_bot_router = serverRouter.createCaller(ao_bot);
});

describe("Server Operations", () => {
  describe("Server Create", () => {
    it("should succeed creating a server as the answer overflow bot", async () => {
      await expect(answer_overflow_bot_router.create(server_1)).resolves.toEqual(server_1);
    });
    it("should test all permission and caller variants to ensure only calls from the Discord bot with Manage Guild & Administrator can succeed", async () => {
      await testAllVariantsThatThrowErrors({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source }) {
          const server = mockServer();
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = serverRouter.createCaller(account.ctx);
          await router.create(server);
        },
      });
    });
  });
  describe("Server Update", () => {
    it("should succeed updating a guild as the answer overflow bot", async () => {
      await answer_overflow_bot_router.create(server_1);
      const server = await answer_overflow_bot_router.update({
        id: server_1.id,
        name: "new name",
      });
      expect(server).toEqual({ ...server_1, name: "new name" });
    });
    it("should test all permission and caller variants to ensure only calls from the Discord bot with Manage Guild & Administrator can succeed", async () => {
      return await testAllVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const server = mockServer();
          await answer_overflow_bot_router.create(server);
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = serverRouter.createCaller(account.ctx);
          await router.update({ id: server.id, name: "new name" });
        },
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
      });
    });
  });

  describe("Server Fetch", () => {
    const server_2 = mockServer({
      kicked_time: new Date(),
    });
    beforeEach(async () => {
      await answer_overflow_bot_router.create(server_2);
    });
    it("should succeed fetching a server as the answer overflow bot", async () => {
      await expect(answer_overflow_bot_router.byId(server_2.id)).resolves.toEqual(server_2);
    });
    it("should succeed fetching a server with permission variants", async () => {
      await testAllDataVariants({
        async fetch({ source, permission }) {
          const account = await mockAccountWithServersCallerCtx(server_2, source, permission);
          const router = serverRouter.createCaller(account.ctx);
          const data = await router.byId(server_2.id);
          return {
            data,
            private_data_format: server_2,
            public_data_format: pick(server_2, ["id", "name", "icon"]),
          };
        },
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
      });
    });
  });

  describe("Server Upsert", () => {
    it("should succeed upserting a server as the answer overflow bot", async () => {
      await expect(answer_overflow_bot_router.upsert(server_1)).resolves.toEqual(server_1);
    });
    it("should test all server create upsert variants", async () => {
      await testAllVariantsThatThrowErrors({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source }) {
          const server = mockServer();
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = serverRouter.createCaller(account.ctx);
          await router.upsert(server);
        },
      });
    });
  });

  describe("Server Delete", () => {
    test.todo("should succeed deleting a server as the answer overflow bot");
    test.todo("should succeed deleting a server with server settings as the answer overflow bot");
    test.todo("should succeed deleting a server with channels as the answer overflow bot");
    test.todo("should succeed deleting a server with user server settings as answer overflow bot");
    test.todo("should test all server create delete variants");
  });
});
