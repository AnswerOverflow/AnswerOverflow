import type { UserServerSettings } from "@prisma/client";
import { bitfieldToDict, dictToBitfield, mergeFlags } from "./utils/bitfield";

export const user_server_settings_flags = [
  "can_publicly_display_messages",
  "message_indexing_disabled",
] as const;

export const bitfieldToUserServerSettingsFlags = (bitfield: number) =>
  bitfieldToDict(bitfield, user_server_settings_flags);

export function addFlagsToUserServerSettings<T extends UserServerSettings>(
  user_server_settings: T
) {
  return {
    ...user_server_settings,
    flags: bitfieldToUserServerSettingsFlags(user_server_settings.bitfield),
  };
}

export function mergeUserServerSettingsFlags(old: number, new_flags: Record<string, boolean>) {
  return mergeFlags(
    () => bitfieldToUserServerSettingsFlags(old),
    new_flags,
    (flags) => dictToBitfield(flags, user_server_settings_flags)
  );
}
