import {
  zChannelPublic,
  findChannelById,
  ChannelWithFlags,
  zChannelCreate,
  getDefaultChannelWithFlags,
  upsertChannel,
  upsertServer,
  zServerCreate,
} from "@answeroverflow/db";
import { z } from "zod";
import { router, publicProcedure, withUserServersProcedure } from "~api/router/trpc";
import {
  assertBoolsAreNotEqual,
  assertCanEditServer,
  assertCanEditServerBotOnly,
} from "~api/utils/permissions";
import {
  PermissionsChecks,
  protectedFetchWithPublicData,
  protectedMutation,
} from "~api/utils/protected-procedures";
import type { Context } from "../context";

export const CHANNEL_NOT_FOUND_MESSAGES = "Channel does not exist";

const zChannelWithServerCreate = zChannelCreate
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

const zChannelFlagChange = z.object({
  channel: zChannelWithServerCreate,
  enabled: z.boolean(),
});

export const INDEXING_ALREADY_ENABLED_ERROR_MESSAGE = "Indexing already enabled";
export const INDEXING_ALREADY_DISABLED_ERROR_MESSAGE = "Indexing already disabled";
export const FORUM_GUIDELINES_CONSENT_ALREADY_ENABLED_ERROR_MESSAGE =
  "Forum post guidelines consent already enabled";
export const FORUM_GUIDELINES_CONSENT_ALREADY_DISABLED_ERROR_MESSAGE =
  "Forum post guidelines consent already disabled";

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
  setIndexingEnabled: withUserServersProcedure
    .input(zChannelFlagChange)
    .mutation(async ({ ctx, input }) => {
      return mutateChannel({
        canUpdate:
          ({ oldSettings }) =>
          () =>
            assertBoolsAreNotEqual({
              messageIfBothFalse: INDEXING_ALREADY_DISABLED_ERROR_MESSAGE,
              messageIfBothTrue: INDEXING_ALREADY_ENABLED_ERROR_MESSAGE,
              newValue: input.enabled,
              oldValue: oldSettings.flags.indexingEnabled,
            }),
        channel: input.channel,
        ctx,
        updateData: {
          flags: {
            indexingEnabled: input.enabled,
          },
        },
      });
    }),
  setForumGuidelinesConsentEnabled: withUserServersProcedure
    .input(zChannelFlagChange)
    .mutation(async ({ ctx, input }) => {
      return mutateChannel({
        canUpdate:
          ({ oldSettings }) =>
          () =>
            assertBoolsAreNotEqual({
              messageIfBothFalse: FORUM_GUIDELINES_CONSENT_ALREADY_DISABLED_ERROR_MESSAGE,
              messageIfBothTrue: FORUM_GUIDELINES_CONSENT_ALREADY_ENABLED_ERROR_MESSAGE,
              newValue: input.enabled,
              oldValue: oldSettings.flags.forumGuidelinesConsentEnabled,
            }),
        channel: input.channel,
        ctx,
        updateData: {
          flags: {
            forumGuidelinesConsentEnabled: input.enabled,
          },
        },
      });
    }),
});
