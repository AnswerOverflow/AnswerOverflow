import { mockServer } from "@answeroverflow/db-mock";
import { createServer, Server } from "@answeroverflow/db";
import { pickPublicServerData } from "~api/test/public-data";
import {
  testAllSourceAndPermissionVariantsThatThrowErrors,
  mockAccountWithServersCallerCtx,
  testAllPublicAndPrivateDataVariants,
} from "~api/test/utils";
import { MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE } from "~api/utils/permissions";
import { serverRouter } from "./server";

describe("Server Operations", () => {
  describe("Server Create", () => {
    it("should test all permission and caller variants to ensure only calls from the Discord bot with Manage Guild & Administrator can succeed", async () => {
      await testAllSourceAndPermissionVariantsThatThrowErrors({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permissionFailureMessage: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
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
      return await testAllSourceAndPermissionVariantsThatThrowErrors({
        async operation({ source, permission }) {
          const server = mockServer();
          await createServer(server);
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = serverRouter.createCaller(account.ctx);
          await router.update({
            id: server.id,
            name: "new name",
            flags: {
              readTheRulesConsentEnabled: true,
            },
          });
        },
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permissionFailureMessage: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
      });
    });
  });

  describe("Server Fetch", () => {
    let server2: Server;
    beforeEach(async () => {
      server2 = mockServer({
        kickedTime: new Date(),
      });
      await createServer(server2);
    });
    it("should succeed fetching a server with permission variants", async () => {
      await testAllPublicAndPrivateDataVariants({
        async fetch({ source, permission }) {
          const account = await mockAccountWithServersCallerCtx(server2, source, permission);
          const router = serverRouter.createCaller(account.ctx);
          const data = await router.byId(server2.id);
          return {
            data,
            privateDataFormat: data,
            publicDataFormat: pickPublicServerData(server2),
          };
        },
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
      });
    });
  });

  describe("Server Upsert", () => {
    it("should test all server create upsert variants", async () => {
      await testAllSourceAndPermissionVariantsThatThrowErrors({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permissionFailureMessage: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
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
