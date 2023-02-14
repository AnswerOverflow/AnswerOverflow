import { findUserServerSettingsById, zUserServerSettingsFind } from "@answeroverflow/db";
import { withDiscordAccountProcedure, MergeRouters, router } from "../trpc";
import { protectedFetch, protectedMutation } from "~api/utils/protected-procedures";
import { assertIsUser } from "~api/utils/permissions";
import {
  CONSENT_SOURCES,
  MANAGE_ACCOUNT_SOURCES,
  updateUserConsent,
  updateUserServerIndexingPreference,
  zUpdateUserConsetInput,
  zUpdateUserIndexingInServerDisabledData,
} from "@answeroverflow/domains";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { findOrThrowNotFound } from "~api/utils/operations";
export const SERVER_NOT_SETUP_MESSAGE = "Server is not setup for Answer Overflow yet";

const userServerSettingsCrudRouter = router({
  byId: withDiscordAccountProcedure.input(zUserServerSettingsFind).query(async ({ input, ctx }) => {
    return protectedFetch({
      permissions: () => assertIsUser(ctx, input.userId),
      fetch: () => findUserServerSettingsById(input),
      notFoundMessage: "User server settings not found",
    });
  }),
  setIndexingDisabled: withDiscordAccountProcedure
    .input(
      z.object({
        source: z.enum(MANAGE_ACCOUNT_SOURCES),
        data: zUpdateUserIndexingInServerDisabledData,
      })
    )
    .mutation(async ({ input, ctx }) => {
      return protectedMutation({
        permissions: () => assertIsUser(ctx, input.data.user.id),
        operation: () =>
          findOrThrowNotFound(
            () =>
              updateUserServerIndexingPreference({
                updateData: input.data,
                source: input.source,
                onError(error) {
                  throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: error.message,
                  });
                },
              }),
            "User server settings not found"
          ),
      });
    }),
  setConsentGranted: withDiscordAccountProcedure
    .input(
      z.object({
        source: z.enum(CONSENT_SOURCES),
        data: zUpdateUserConsetInput,
      })
    )
    .mutation(async ({ input, ctx }) => {
      return protectedMutation({
        permissions: () => assertIsUser(ctx, input.data.user.id),
        operation: () =>
          findOrThrowNotFound(
            () =>
              updateUserConsent({
                source: input.source,
                onError(error) {
                  throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: error.message,
                  });
                },
                updateData: input.data,
              }),
            "User server settings not found"
          ),
      });
    }),
});

export const userServerSettingsRouter = MergeRouters(userServerSettingsCrudRouter);
