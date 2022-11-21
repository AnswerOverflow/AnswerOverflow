import { BitField } from "@sapphire/bitfield";

const USER_SERVER_SETTINGS_BITFIELD = {
  ALLOWED_TO_SHOW_MESSAGES: 1 << 0,
  MESSAGE_INDEXING_DISABLED: 1 << 1,
};

export function parseUserServerSettings(value: number) {
  const bitfield = getUserServerSettingsBitfield();
  return {
    allowed_to_show_messages: bitfield.has(value, "ALLOWED_TO_SHOW_MESSAGES"),
    message_indexing_disabled: bitfield.has(value, "MESSAGE_INDEXING_DISABLED"),
  };
}

function getUserServerSettingsBitfield() {
  return new BitField(USER_SERVER_SETTINGS_BITFIELD);
}

export function enableUserServerSettingsFlag(
  settings: number,
  flag: keyof typeof USER_SERVER_SETTINGS_BITFIELD
) {
  const bitfield = getUserServerSettingsBitfield();
  return bitfield.resolve([settings, flag]);
}

export function disableUserServerSettingsFlag(
  settings: number,
  flag: keyof typeof USER_SERVER_SETTINGS_BITFIELD
) {
  const bitfield = getUserServerSettingsBitfield();
  return bitfield.intersection(settings, bitfield.complement(flag));
}
