import { findChannelById, upsertChannel } from "@answeroverflow/core/channel";
import { upsertServer } from "@answeroverflow/core/server";
import { getDefaultChannelWithFlags } from "@answeroverflow/core/utils/channelUtils";
import {
  ChannelWithFlags,
  zChannelCreate,
  zServerCreate,
} from "@answeroverflow/core/zod";
import { z } from "zod";
import {
  assertCanEditServer,
  assertCanEditServerBotOnly,
} from "../utils/permissions";
import {
  PermissionsChecks,
  protectedFetch,
  protectedMutation,
} from "../utils/protected-procedures";
import { Context } from "./context";
import { publicProcedure, router } from "./trpc";

export const CHANNEL_NOT_FOUND_MESSAGES = "Channel does not exist";

export const zChannelWithServerCreate = zChannelCreate
  .omit({
    serverId: true,
  })
  .merge(
    z.object({
      server: zServerCreate,
    })
  );

async function mutateChannel({
  canUpdate,
  channel,
  updateData,
  ctx,
}: {
  canUpdate: (input: {
    oldSettings: ChannelWithFlags;
    doSettingsExistAlready: boolean;
  }) => PermissionsChecks;
  channel: z.infer<typeof zChannelWithServerCreate>;
  updateData: Parameters<typeof upsertChannel>[0]["update"];
  ctx: Context;
}) {
  return protectedMutation({
    permissions: () => assertCanEditServerBotOnly(ctx, channel.server.id),
    operation: async () => {
      const channelWithServerId = {
        ...channel,
        serverId: channel.server.id,
      };
      let oldSettings = await findChannelById(channel.id);
      let doSettingsExistAlready = true;
      if (!oldSettings) {
        oldSettings = getDefaultChannelWithFlags(channelWithServerId);
        doSettingsExistAlready = false;
      } else {
        doSettingsExistAlready = true;
      }
      // We only want to create the server
      await upsertServer({
        create: channel.server,
        update: {},
      });
      return protectedMutation({
        permissions: canUpdate({ oldSettings, doSettingsExistAlready }),
        operation: async () =>
          upsertChannel({
            create: {
              ...channelWithServerId,
              ...updateData,
            },
            update: updateData,
          }),
      });
    },
  });
}

export const channelRouter = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetch({
      fetch: () => findChannelById(input),
      permissions: (data) => assertCanEditServer(ctx, data.serverId),
      notFoundMessage: CHANNEL_NOT_FOUND_MESSAGES,
    });
  }),
});
