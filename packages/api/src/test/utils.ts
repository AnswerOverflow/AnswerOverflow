import type { Server } from "@answeroverflow/db";
import type { ChannelUpsertInput } from "~utils/types";

export const TEST_SERVER_1: Server = {
  id: "test",
  name: "test",
  icon: null,
  kicked_time: null,
};

export const TEST_CHANNEL_1: ChannelUpsertInput["create"] = {
  id: "test",
  name: "test",
  type: 0,
  server: {
    create: { id: TEST_SERVER_1.id, name: TEST_SERVER_1.name },
    update: { name: TEST_SERVER_1.name },
  },
};
