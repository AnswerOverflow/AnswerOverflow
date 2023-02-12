import type { GuildMember } from "discord.js";
import { createMemberCtx } from "~discord-bot/utils/context";
import { callAPI, TRPCCall } from "~discord-bot/utils/trpc";

export const UPDATE_SETTING_ERROR_REASONS = ["api-error"];
export type UpdateSettingsErrorReason = (typeof UPDATE_SETTING_ERROR_REASONS)[number];

export class UpdateSettingsError extends Error {
  constructor(message: string, public reason: UpdateSettingsErrorReason) {
    super(message);
    this.name = "UpdateSettingsError";
  }
}
// 🤮
export async function updateSetting<T, F>({
  member,
  newValue,
  onError = () => {},
  onSettingChange = () => {},
  updateSettings,
  checkIfSettingIsAlreadySet,
  fetchSettings,
}: {
  member: GuildMember;
  newValue: T;
  onError?: (error: UpdateSettingsError) => void;
  onSettingChange?: (newSettings: F) => void;
  fetchSettings: TRPCCall<F>["apiCall"];
  updateSettings: TRPCCall<F>["apiCall"];
  checkIfSettingIsAlreadySet: (input: { existingSettings: F; newValue: T }) => void | Promise<void>;
}) {
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
      apiCall: updateSettings,
      getCtx: () => createMemberCtx(member),
      Error: (_, messageWithCode) => {
        throw new UpdateSettingsError(messageWithCode, "api-error");
      },
      Ok(result) {
        onSettingChange(result);
      },
    });
    return updatedSettings;
  } catch (error) {
    if (!(error instanceof UpdateSettingsError)) throw error;
    onError(error);
    return null;
  }
}
