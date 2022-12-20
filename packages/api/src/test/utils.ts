import { getDefaultServer } from "@answeroverflow/db";
import type { ChannelUpsertInput } from "~api/utils/types";

export const TEST_SERVER_1 = getDefaultServer({
  id: "101",
  name: "test",
});

export const TEST_SERVER_2 = getDefaultServer({
  id: "102",
  name: "test2",
});

export const TEST_CHANNEL_1: ChannelUpsertInput["create"] = {
  id: "301",
  name: "test",
  type: 0,
  server: {
    create: { id: TEST_SERVER_1.id, name: TEST_SERVER_1.name },
    update: { name: TEST_SERVER_1.name },
  },
};
