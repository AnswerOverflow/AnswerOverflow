import { ChannelSettings } from "@prisma/client";
import {
  ChannelSettingsManager,
  ChannelSettingsUpdateArgs,
} from "../managers/channel-settings/channel-settings-manager";
import { PermissionsBitField } from "../utils/bitfield";
import { ExtendedBase } from "./base";

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

export function getDefaultChannelSettings(channel_id: string): ChannelSettingsWithBitfield {
  return {
    bitfield: new PermissionsBitField(ChannelSettingsFlags, 0),
    channel_id: channel_id,
    invite_code: null,
    last_indexed_snowflake: null,
    permissions: 0,
    solution_tag_id: null,
  };
}

export class ChannelSettingsExtended extends ExtendedBase<ChannelSettings> {
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
    return new PermissionsBitField(ChannelSettingsFlags, this.data.permissions);
  }
  constructor(
    // eslint-disable-next-line no-unused-vars
    data: ChannelSettings,
    // eslint-disable-next-line no-unused-vars
    public readonly manager: ChannelSettingsManager
  ) {
    super(data);
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

  public async update(args: ChannelSettingsUpdateArgs) {
    return this.manager.update(this, args);
  }

  private changeSetting(flag: keyof typeof ChannelSettingsFlags, enabled: boolean) {
    if (enabled) {
      this.data.permissions = this.settings.setFlag(flag).value;
    } else {
      this.data.permissions = this.settings.clearFlag(flag).value;
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
    return await this.update({ permissions: this.settings.value });
  }

  public async enableIndexing(invite_code: string) {
    this.changeSetting("INDEXING_ENABLED", true);
    return this.update({ permissions: this.settings.value, invite_code });
  }

  public async disableIndexing() {
    this.changeSetting("INDEXING_ENABLED", false);
    return this.update({ permissions: this.settings.value });
  }

  /*
    Help Channel Utils
  */
  public async setMarkSolutionEnabled(enabled: boolean) {
    this.changeSetting("MARK_SOLUTION_ENABLED", enabled);
    return await this.update({ permissions: this.settings.value });
  }

  public async setSendMarkSolutionInstructionsInNewThreads(enabled: boolean) {
    this.changeSetting("SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS", enabled);
    return await this.update({ permissions: this.settings.value });
  }

  public async setAutoThreadEnabled(enabled: boolean) {
    this.changeSetting("AUTO_THREAD_ENABLED", enabled);
    return await this.update({ permissions: this.settings.value });
  }

  public async setSolvedTagId(tag_id: string | null) {
    return this.update({ solution_tag_id: tag_id });
  }
}
