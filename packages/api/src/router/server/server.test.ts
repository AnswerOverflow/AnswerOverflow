import { mockServer } from "@answeroverflow/db-mock";
import { createServer, Server } from "@answeroverflow/db";
import { pickPublicServerData } from "~api/test/public-data";
import {
  mockAccountWithServersCallerCtx,
  testAllPublicAndPrivateDataVariants,
} from "~api/test/utils";
import { serverRouter } from "./server";

describe("Server Operations", () => {
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
});
