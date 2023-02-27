import { zServerPublic, findServerById } from "@answeroverflow/db";
import { z } from "zod";
import { router, withUserServersProcedure } from "~api/router/trpc";
import { assertCanEditServer } from "~api/utils/permissions";
import { protectedFetchWithPublicData } from "~api/utils/protected-procedures";

export const serverRouter = router({
  byId: withUserServersProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findServerById(input),
      permissions: () => assertCanEditServer(ctx, input),
      notFoundMessage: "Server not found",
      publicDataFormatter: (server) => zServerPublic.parse(server),
    });
  }),
});
