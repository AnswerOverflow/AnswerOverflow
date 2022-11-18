import { ChannelSettings } from "@prisma/client";
import { BaseManaged } from "../../primitives/base";
import { PermissionsBitField } from "../../utils/bitfield";
import { ChannelSettings_Manager } from "./manager";
export const ChannelSettingsFlags = {
  INDEXING_ENABLED: 1 << 0,
  MARK_SOLUTION_ENABLED: 1 << 1,
  SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS: 1 << 2,
  AUTO_THREAD_ENABLED: 1 << 3,
  CONSENT_PROMPT_IN_POST_GUIDELINES: 1 << 4,
};

export type ChannelSettingsWithBitfield = {
  bitfield: PermissionsBitField<typeof ChannelSettingsFlags>;
} & ChannelSettings;

export function getDefaultChannelSettings(channel_id: string): ChannelSettings {
  return {
    channel_id: channel_id,
    invite_code: null,
    last_indexed_snowflake: null,
    settings: 0,
    solution_tag_id: null,
  };
}

export class ChannelSettings_Extended extends BaseManaged<ChannelSettings> {
  constructor(public data: ChannelSettings, public readonly manager: ChannelSettings_Manager) {
    super(data, manager);
  }

  public getCacheId(): string {
    return this.data.channel_id;
  }
  public updateCacheEntry(data: ChannelSettings): void {
    this.data = data;
  }

  get channel_id() {
    return this.data.channel_id;
  }

  get settings() {
    return new PermissionsBitField(ChannelSettingsFlags, this.data.settings);
  }
  get invite_code() {
    return this.data.invite_code;
  }

  get solution_tag_id() {
    return this.data.solution_tag_id;
  }

  get last_indexed_snowflake() {
    return this.data.last_indexed_snowflake;
  }

  get indexing_enabled() {
    return this.settings.checkFlag("INDEXING_ENABLED");
  }

  get mark_solution_enabled() {
    return this.settings.checkFlag("MARK_SOLUTION_ENABLED");
  }

  get send_mark_solution_instructions_in_new_threads() {
    return this.settings.checkFlag("SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS");
  }

  get consent_prompt_in_post_guidelines() {
    return this.settings.checkFlag("CONSENT_PROMPT_IN_POST_GUIDELINES");
  }

  get auto_thread_enabled() {
    return this.settings.checkFlag("AUTO_THREAD_ENABLED");
  }

  private changeSetting(flag: keyof typeof ChannelSettingsFlags, enabled: boolean) {
    if (enabled) {
      this.data.settings = this.settings.setFlag(flag).value;
    } else {
      this.data.settings = this.settings.clearFlag(flag).value;
    }
  }

  /*
    Indexing
  */
  public async setLastIndexedSnowflake(snowflake: string | null) {
    return this.update({ last_indexed_snowflake: snowflake });
  }

  public async setConsentPromptInPostGuidelines(enabled: boolean) {
    this.changeSetting("CONSENT_PROMPT_IN_POST_GUIDELINES", enabled);
    return await this.update({ settings: this.settings.value });
  }

  public async enableIndexing(invite_code: string) {
    this.changeSetting("INDEXING_ENABLED", true);
    return this.update({ settings: this.settings.value, invite_code });
  }

  public async disableIndexing() {
    this.changeSetting("INDEXING_ENABLED", false);
    return this.update({ settings: this.settings.value });
  }

  /*
    Help Channel Utils
  */
  public async setMarkSolutionEnabled(enabled: boolean) {
    this.changeSetting("MARK_SOLUTION_ENABLED", enabled);
    return await this.update({ settings: this.settings.value });
  }

  public async setSendMarkSolutionInstructionsInNewThreads(enabled: boolean) {
    this.changeSetting("SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS", enabled);
    return await this.update({ settings: this.settings.value });
  }

  public async setAutoThreadEnabled(enabled: boolean) {
    this.changeSetting("AUTO_THREAD_ENABLED", enabled);
    return await this.update({ settings: this.settings.value });
  }

  public async setSolvedTagId(tag_id: string | null) {
    return this.update({ solution_tag_id: tag_id });
  }
}
