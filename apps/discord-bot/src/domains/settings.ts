import type { GuildMember } from "discord.js";
import type { BotRouterCaller } from "@answeroverflow/api";
import { createMemberCtx } from "~discord-bot/utils/context";
import { callAPI } from "~discord-bot/utils/trpc";

export const UPDATE_SETTING_ERROR_REASONS = [
  "api-error",
  // No op, i.e the setting is already set to the value we want to set it to
  "target-value-already-equals-goal-value",
  // The user has already set this setting, and we don't want to override it i.e in automated scenarios
  "setting-already-explicitly-set",
] as const;
export type UpdateSettingsErrorReason = (typeof UPDATE_SETTING_ERROR_REASONS)[number];

export class UpdateSettingsError extends Error {
  constructor(message: string, public reason: UpdateSettingsErrorReason) {
    super(message);
    this.name = "UpdateSettingsError";
  }
}

export type UpdateSettingsOptions<T, F> = {
  member: GuildMember;
  newValue: T;
  fetchSettings: (router: BotRouterCaller) => Promise<F | null>;
  checkIfSettingIsAlreadySet: (input: { existingSettings: F; newValue: T }) => void | Promise<void>;
  updateSettings: (router: BotRouterCaller, newValue: T) => Promise<F>;
  onSettingChange?: (newSettings: F) => void | Promise<void>;
  onError: (error: UpdateSettingsError) => unknown | Promise<unknown>;
};

// 🤮
export async function updateSetting<T, F>({
  member,
  newValue,
  fetchSettings,
  checkIfSettingIsAlreadySet,
  updateSettings,
  onSettingChange = () => {},
  onError,
}: UpdateSettingsOptions<T, F>) {
  try {
    const existingSettings = await callAPI({
      apiCall: fetchSettings,
      getCtx: () => createMemberCtx(member),
      Error: (_, messageWithCode) => {
        throw new UpdateSettingsError(messageWithCode, "api-error");
      },
    });
    // Check if the setting is already set to the desired value
    if (existingSettings) {
      await checkIfSettingIsAlreadySet({ existingSettings, newValue });
    }
    // Update the setting
    const updatedSettings = await callAPI({
      apiCall: (router) => updateSettings(router, newValue),
      getCtx: () => createMemberCtx(member),
      Error: (_, messageWithCode) => {
        throw new UpdateSettingsError(messageWithCode, "api-error");
      },
      async Ok(result) {
        await onSettingChange(result);
      },
    });
    return updatedSettings;
  } catch (error) {
    if (!(error instanceof UpdateSettingsError)) throw error;
    await onError(error);

    return null;
  }
}
