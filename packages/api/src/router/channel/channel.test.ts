import { Channel, createChannel, createServer, Server } from "@answeroverflow/db";
import {
  mockAccountWithServersCallerCtx,
  testAllPublicAndPrivateDataVariants,
} from "~api/test/utils";
import { channelRouter } from "./channel";
import { mockChannel, mockServer } from "@answeroverflow/db-mock";
import { pick } from "@answeroverflow/utils";
import type { ChannelFindByIdOutput } from "~api/utils/types";

let server: Server;
let channel: Channel;

beforeEach(async () => {
  server = mockServer();
  channel = mockChannel(server);
  await createServer(server);
});

export function pickPublicChannelData(channel: ChannelFindByIdOutput) {
  const picked = pick(channel, ["id", "name", "parentId", "serverId", "type", "inviteCode"]);
  return picked;
}

describe("Channel Operations", () => {
  describe("Channel Fetch", () => {
    beforeEach(async () => {
      await createChannel(channel);
    });
    it("tests all variants for fetching a single channel", async () => {
      await testAllPublicAndPrivateDataVariants({
        sourcesThatShouldWork: ["discord-bot", "web-client"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        async fetch({ permission, source }) {
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = channelRouter.createCaller(account.ctx);
          const data = await router.byId(channel.id);
          return {
            data,
            privateDataFormat: data,
            publicDataFormat: pickPublicChannelData(data),
          };
        },
      });
    });
  });
});
