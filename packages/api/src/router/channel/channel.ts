import { zChannelPublic, findChannelById } from "@answeroverflow/db";
import { z } from "zod";
import { router, publicProcedure } from "~api/router/trpc";
import { protectedFetchWithPublicData } from "~api/utils/protected-procedures";
import { assertCanEditServer } from "~api/utils/permissions";

export const CHANNEL_NOT_FOUND_MESSAGES = "Channel does not exist";

export const channelRouter = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findChannelById(input),
      permissions: (data) => assertCanEditServer(ctx, data.serverId),
      notFoundMessage: CHANNEL_NOT_FOUND_MESSAGES,
      publicDataFormatter: (data) => {
        return zChannelPublic.parse(data);
      },
    });
  }),
});
