import { getDefaultChannel, getDefaultServer } from "@answeroverflow/db";

export const TEST_SERVER_1 = getDefaultServer({
  id: "101",
  name: "test",
});

export const TEST_SERVER_2 = getDefaultServer({
  id: "201",
  name: "test",
});

export function getServerTestData(server_id: string = "101") {
  return {
    server: getDefaultServer({
      id: server_id,
      name: "test",
    }),
    channels: [
      getDefaultChannel({
        id: "201",
        name: "name",
        server_id: TEST_SERVER_1.id,
        type: 0,
      }),
      getDefaultChannel({
        id: "202",
        name: "name2",
        server_id: TEST_SERVER_1.id,
        type: 0,
      }),
    ],
  };
}
