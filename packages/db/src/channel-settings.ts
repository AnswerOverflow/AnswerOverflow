import type { ChannelSettings } from "@prisma/client";
import { bitfieldToDict } from "./utils/bitfield";

export const channel_settings_flags = [
  "indexing_enabled",
  "auto_thread_enabled",
  "mark_solution_enabled",
  "send_mark_solution_instructions_in_new_threads",
  "forum_guidelines_consent_enabled",
] as const;

export const bitfieldToChannelSettingsFlags = (bitfield: number) =>
  bitfieldToDict(bitfield, channel_settings_flags);

export function addChannelSettingsFlagsToChannelSettings<T extends ChannelSettings>(
  channel_settings: T
) {
  return {
    ...channel_settings,
    flags: bitfieldToChannelSettingsFlags(channel_settings.bitfield),
  };
}
