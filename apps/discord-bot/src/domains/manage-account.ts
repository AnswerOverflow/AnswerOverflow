import type { UserServerSettingsUpsertWithDepsInput } from "packages/api";
import type { UserServerSettingsWithFlags } from "packages/prisma-types";
import { toAODiscordAccount } from "~discord-bot/utils/conversions";
import { callWithAllowedErrors } from "~discord-bot/utils/trpc";
import { updateUserConsent } from "./consent";
import {
  updateSetting,
  UpdateSettingsError,
  UpdateSettingsOptions,
  UPDATE_SETTING_ERROR_REASONS,
} from "./settings";

export const MANAGE_ACCOUNT_SOURCES = ["manage-account-menu"];
export type ManageAccountSource = (typeof MANAGE_ACCOUNT_SOURCES)[number];

export const UPDATE_USER_SERVER_SETTINGS_ERROR_REASONS = [...UPDATE_SETTING_ERROR_REASONS] as const;

export type UpdateUserServerSettingsOptions<
  T extends Partial<UserServerSettingsUpsertWithDepsInput>
> = Pick<
  UpdateSettingsOptions<T, UserServerSettingsWithFlags>,
  "member" | "checkIfSettingIsAlreadySet" | "onSettingChange" | "onError"
> & {
  source: ManageAccountSource;
  updateData: T;
};

export async function updateUserServerSettings<
  T extends Partial<UserServerSettingsUpsertWithDepsInput>
>({ member, updateData, ...rest }: UpdateUserServerSettingsOptions<T>) {
  return updateSetting({
    member,
    newValue: updateData,
    fetchSettings(router) {
      return callWithAllowedErrors({
        call: () =>
          router.userServerSettings.byId({
            serverId: member.guild.id,
            userId: member.id,
          }),
        allowedErrors: "NOT_FOUND",
      });
    },
    updateSettings(router) {
      return router.userServerSettings.upsertWithDeps({
        serverId: member.guild.id,
        user: toAODiscordAccount(member.user),
        ...updateData,
      });
    },
    ...rest,
  });
}

// TODO: Bad name ugly name ewewew
export type UpdateUserServerSettingsOverrideOptions<
  T extends Partial<UserServerSettingsUpsertWithDepsInput>
> = Pick<UpdateUserServerSettingsOptions<T>, "member" | "onError" | "onSettingChange">;

export const UPDATE_USER_SERVER_INDEXING_ENABLED_ERROR_REASONS = [
  ...UPDATE_USER_SERVER_SETTINGS_ERROR_REASONS,
  "already-enabled",
  "already-disabled",
];

export async function updateUserServerIndexingEnabled({
  messageIndexingDisabled,
  member,
  onError,
  onSettingChange,
}: UpdateUserServerSettingsOverrideOptions<{
  flags: {
    messageIndexingDisabled: boolean;
  };
}> & {
  messageIndexingDisabled: boolean;
}) {
  let updateConsentResult: UserServerSettingsWithFlags | null = null;
  const result = await updateUserServerSettings({
    member,
    source: "manage-account-menu",
    updateData: {
      flags: {
        messageIndexingDisabled,
      },
    },
    checkIfSettingIsAlreadySet({ existingSettings }) {
      if (existingSettings.flags.messageIndexingDisabled === messageIndexingDisabled) {
        throw new UpdateSettingsError(
          `Message indexing is already ${messageIndexingDisabled ? "disabled" : "enabled"} for ${
            member.guild.name
          }`,
          "target-value-already-equals-goal-value"
        );
      }
    },
    onError: onError,
    async onSettingChange(newSettings) {
      if (newSettings.flags.canPubliclyDisplayMessages) {
        updateConsentResult = await updateUserConsent({
          canPubliclyDisplayMessages: false,
          consentSource: "disable-indexing-button",
          member,
          onError: (err) => {
            if (err.reason === "target-value-already-equals-goal-value") {
              return;
            } else {
              onError?.(err);
            }
          },
          onSettingChange,
        });
      } else {
        await onSettingChange?.(newSettings);
      }
    },
  });
  // If we updated the consent, return that instead as it is the most up to date
  return updateConsentResult ?? result;
}
