import { getDefaultChannel, getDefaultServer } from "@answeroverflow/db";
import type { ChannelUpsertInput } from "~api/utils/types";

export const TEST_SERVER_1 = getDefaultServer({
  id: "101",
  name: "test",
});

export const TEST_SERVER_2 = getDefaultServer({
  id: "102",
  name: "test2",
});

export const TEST_CHANNEL_1 = getDefaultChannel({
  id: "201",
  name: "test",
  server_id: TEST_SERVER_1.id,
  type: 0,
});

export const TEST_CHANNEL_2 = getDefaultChannel({
  id: "202",
  name: "test2",
  server_id: TEST_SERVER_2.id,
  type: 0,
});

export const TEST_CHANNEL_UPSERT_CREATE_1: ChannelUpsertInput["create"] = {
  ...TEST_CHANNEL_1,
  server: {
    create: { id: TEST_SERVER_1.id, name: TEST_SERVER_1.name },
    update: { name: TEST_SERVER_1.name },
  },
};

export const TEST_CHANNEL_UPSERT_CREATE_2: ChannelUpsertInput["create"] = {
  ...TEST_CHANNEL_2,
  server: {
    create: { id: TEST_SERVER_2.id, name: TEST_SERVER_2.name },
    update: { name: TEST_SERVER_2.name },
  },
};

export const TEST_CHANNEL_1_UPSERT: ChannelUpsertInput = {
  create: TEST_CHANNEL_UPSERT_CREATE_1,
  update: {
    ...TEST_CHANNEL_1,
  },
};

export const TEST_CHANNEL_2_UPSERT: ChannelUpsertInput = {
  create: TEST_CHANNEL_UPSERT_CREATE_2,
  update: {
    ...TEST_CHANNEL_2,
  },
};
