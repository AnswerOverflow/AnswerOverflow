import { mockServer } from "@answeroverflow/db-mock";
import { createServer, Server } from "@answeroverflow/db";
import { pickPublicServerData } from "~api/test/public_data";
import {
  testAllVariantsThatThrowErrors,
  mockAccountWithServersCallerCtx,
  testAllDataVariants,
} from "~api/test/utils";
import { MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE } from "~api/utils/permissions";
import { serverRouter } from "./server";
import { prisma } from "@answeroverflow/db";
describe("Server Operations", () => {
  describe("Server Create", () => {
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
    it("should test all permission and caller variants to ensure only calls from the Discord bot with Manage Guild & Administrator can succeed", async () => {
      return await testAllVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const server = mockServer();
          await createServer(server, prisma);
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
    let server_2: Server;
    beforeEach(async () => {
      server_2 = mockServer({
        kicked_time: new Date(),
      });
      await createServer(server_2, prisma);
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
            public_data_format: pickPublicServerData(server_2),
          };
        },
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
      });
    });
  });

  describe("Server Upsert", () => {
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
    test.todo("should test all server delete variants");
  });
});
