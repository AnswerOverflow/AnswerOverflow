import {
  Channel,
  createChannel,
  createManyChannels,
  createServer,
  Server,
} from "@answeroverflow/db";
import {
  testAllVariantsThatThrowErrors,
  mockAccountWithServersCallerCtx,
  testAllDataVariants,
} from "~api/test/utils";
import { channel_router } from "./channel";
import { MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE } from "~api/utils/permissions";
import { mockChannel, mockServer } from "@answeroverflow/db-mock";
import { pick } from "@answeroverflow/utils";
import type { ChannelFindByIdOutput } from "~api/utils/types";

let server: Server;
let channel: Channel;
let channel2: Channel;

beforeEach(async () => {
  server = mockServer();
  channel = mockChannel(server);
  channel2 = mockChannel(server);
  await createServer(server);
});

export function pickPublicChannelData(channel: ChannelFindByIdOutput) {
  const picked = pick(channel, ["id", "name", "parent_id", "server_id", "type", "invite_code"]);
  return picked;
}

describe("Channel Operations", () => {
  describe("Channel Fetch", () => {
    beforeEach(async () => {
      await createChannel(channel);
    });
    it("tests all variants for fetching a single channel", async () => {
      await testAllDataVariants({
        sourcesThatShouldWork: ["discord-bot", "web-client"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        async fetch({ permission, source }) {
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = channel_router.createCaller(account.ctx);
          const data = await router.byId(channel.id);
          return {
            data,
            private_data_format: data,
            public_data_format: pickPublicChannelData(data),
          };
        },
      });
    });
  });
  describe("Channel Fetch Many", () => {
    beforeEach(async () => {
      await createManyChannels([channel, channel2]);
    });
    it("tests all variants for fetching many channels", async () => {
      await testAllDataVariants({
        sourcesThatShouldWork: ["discord-bot", "web-client"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        async fetch({ permission, source }) {
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = channel_router.createCaller(account.ctx);
          const data = await router.byIdMany([channel.id, channel2.id]);
          return {
            data,
            private_data_format: data,
            public_data_format: data.map(pickPublicChannelData),
          };
        },
      });
    });
  });
  describe("Channel Create", () => {
    it("tests all variants for creating a single channel", async () => {
      await testAllVariantsThatThrowErrors({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source }) {
          const chnl = mockChannel(server);
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = channel_router.createCaller(account.ctx);
          await router.create(chnl);
        },
      });
    });
  });

  describe("Channel Update", () => {
    beforeEach(async () => {
      await createChannel(channel);
    });
    it("tests all varaints for updating a channel", async () => {
      await testAllVariantsThatThrowErrors({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source }) {
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = channel_router.createCaller(account.ctx);
          await router.update({
            id: channel.id,
            name: "new name",
          });
        },
      });
    });
  });

  describe("Channel Delete", () => {
    it("tests all varaints for deleting a channel", async () => {
      await testAllVariantsThatThrowErrors({
        sourcesThatShouldWork: ["discord-bot"],
        permissionsThatShouldWork: ["ManageGuild", "Administrator"],
        permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
        async operation({ permission, source }) {
          const chnl = mockChannel(server);
          await createChannel(chnl);
          const account = await mockAccountWithServersCallerCtx(server, source, permission);
          const router = channel_router.createCaller(account.ctx);
          await router.delete(chnl.id);
        },
      });
    });
  });
  describe("Channel Upsert", () => {
    describe("Upsert Create", () => {
      it("tests all varaints for upsert creating a channel", async () => {
        await testAllVariantsThatThrowErrors({
          sourcesThatShouldWork: ["discord-bot"],
          permissionsThatShouldWork: ["ManageGuild", "Administrator"],
          permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
          async operation({ permission, source }) {
            const chnl = mockChannel(server);
            const account = await mockAccountWithServersCallerCtx(server, source, permission);
            const router = channel_router.createCaller(account.ctx);
            await router.upsert(chnl);
          },
        });
      });
    });
    describe("Upsert Update", () => {
      beforeEach(async () => {
        await createChannel(channel);
      });
      it("tests all varaints for upsert updating a channel", async () => {
        await testAllVariantsThatThrowErrors({
          sourcesThatShouldWork: ["discord-bot"],
          permissionsThatShouldWork: ["ManageGuild", "Administrator"],
          permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
          async operation({ permission, source }) {
            const account = await mockAccountWithServersCallerCtx(server, source, permission);
            const router = channel_router.createCaller(account.ctx);
            await router.upsert({
              ...channel,
              name: "new name",
            });
          },
        });
      });
    });
  });
});
