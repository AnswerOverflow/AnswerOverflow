import { mockChannel, mockServer } from "@answeroverflow/db-mock";
import type { Server } from "@answeroverflow/prisma-types";
import { createChannel, findManyChannelsById, upsertManyChannels } from "./channel";
import { createServer } from "./server";

let server: Server;
beforeEach(async () => {
  server = mockServer();
  await createServer(server);
});

describe("Channel Operations", () => {
  describe("Channel Upsert Many", () => {
    it("should create many channels", async () => {
      const chnl1 = mockChannel(server);
      const chnl2 = mockChannel(server);

      const created = await upsertManyChannels([
        {
          ...chnl1,
          flags: {
            forumGuidelinesConsentEnabled: true,
          },
        },
        chnl2,
      ]);
      expect(created).toHaveLength(2);
      const found = await findManyChannelsById([chnl1.id, chnl2.id]);
      expect(found).toHaveLength(2);
    });
  });
  it("should update many channels", async () => {
    const chnl1 = mockChannel(server);
    const chnl2 = mockChannel(server);
    await createChannel(chnl1);
    await createChannel(chnl2);
    await upsertManyChannels([
      {
        ...chnl1,
        name: "new name",
      },
      {
        ...chnl2,
        name: "new name",
      },
    ]);
    const found = await findManyChannelsById([chnl1.id, chnl2.id]);
    expect(found).toHaveLength(2);
    expect(found?.[0]!.name).toBe("new name");
    expect(found?.[1]!.name).toBe("new name");
  });
});
