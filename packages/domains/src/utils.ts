export const UPDATE_SETTING_ERROR_REASONS = [
  "api-error",
  // No op, i.e the setting is already set to the value we want to set it to
  "target-value-already-equals-goal-value",
  // The user has already set this setting, and we don't want to override it i.e in automated scenarios
  "setting-already-explicitly-set",
  // Another setting is preventing this setting from being set
  "setting-prevented-by-other-setting",
] as const;
export type UpdateSettingsErrorReason = (typeof UPDATE_SETTING_ERROR_REASONS)[number];

export class UpdateSettingsError extends Error {
  constructor(message: string, public reason: UpdateSettingsErrorReason) {
    super(message);
    this.name = "UpdateSettingsError";
  }
}

export type UpdateSettingsOptions<T, F> = {
  newValue: T;
  fetchSettings: () => Promise<F | null>;
  checkIfSettingIsAlreadySet: (input: { existingSettings: F; newValue: T }) => void | Promise<void>;
  updateSettings: (newValue: T, existing: F | null) => Promise<F>;
  onSettingChange?: (newSettings: F) => void | Promise<void>;
  onError: (error: UpdateSettingsError) => unknown | Promise<unknown>;
};

export async function updateSetting<T, F>({
  newValue,
  fetchSettings,
  checkIfSettingIsAlreadySet,
  updateSettings,
  onSettingChange = () => {},
  onError,
}: UpdateSettingsOptions<T, F>) {
  try {
    const existingSettings = await fetchSettings();
    // Check if the setting is already set to the desired value
    if (existingSettings) {
      await checkIfSettingIsAlreadySet({ existingSettings, newValue });
    }
    // Update the setting
    const updatedSettings = await updateSettings(newValue, existingSettings);
    await onSettingChange(updatedSettings);
    return updatedSettings;
  } catch (error) {
    if (!(error instanceof UpdateSettingsError)) throw error;
    await onError(error);
    return null;
  }
}
