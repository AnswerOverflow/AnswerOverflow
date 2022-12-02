import { ChannelSettings } from "@answeroverflow/db";
import { addChannelSettingsFlagsToChannelSettings } from "../router/channel_settings";
import { ChannelSettingsOutput } from "./types";

export function getDefaultChannelSettings(channel_id: string): ChannelSettingsOutput {
  const default_settings: ChannelSettings = {
    channel_id: channel_id,
    bitfield: 0,
    invite_code: null,
    last_indexed_snowflake: null,
    solution_tag_id: null,
  };
  return addChannelSettingsFlagsToChannelSettings(default_settings);
}
