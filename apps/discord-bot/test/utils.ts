import type { UserServerSettingsWithFlags } from "@answeroverflow/prisma-types";
import type { Client, GuildMember } from "discord.js";
import {
  createDiscordAccount,
  createServer,
  createUserServerSettings,
  findUserServerSettingsById,
} from "@answeroverflow/db";
import { mockGuildMember } from "@answeroverflow/discordjs-mock";
import type { PartialDeep } from "type-fest";
import { toAODiscordAccount, toAOServer } from "~discord-bot/utils/conversions";
import type { UpdateSettingsError } from "~discord-bot/domains/settings";

export async function testUpdateUserServerSettings<
  T extends Omit<PartialDeep<UserServerSettingsWithFlags>, "serverId" | "userId">,
  S extends string
>({
  sources,
  client,
  startingSettings,
  operation,
  validate,
}: {
  operation: (input: {
    member: GuildMember;
    source: S;
    startingSettings: T | null;
    onError: (error: UpdateSettingsError) => void;
  }) => Promise<UserServerSettingsWithFlags | null>;
  validate: (input: {
    member: GuildMember;
    source: S;
    startingSettings: T | null;
    updated: UserServerSettingsWithFlags | null;
    updateSettingsError?: UpdateSettingsError;
  }) => void;
  sources: S[];
  client: Client;
  startingSettings: T | null;
}) {
  for (const source of sources) {
    let updateSettingsError: UpdateSettingsError | undefined = undefined;
    const member = mockGuildMember({ client });
    await createServer(toAOServer(member.guild));
    await createDiscordAccount(toAODiscordAccount(member.user));
    if (startingSettings !== null) {
      await createUserServerSettings({
        serverId: member.guild.id,
        userId: member.id,
        ...startingSettings,
      });
    }
    const updated = await operation({
      member,
      source,
      startingSettings,
      onError(error) {
        updateSettingsError = error;
      },
    });
    if (!updateSettingsError) {
      const found = await findUserServerSettingsById({
        serverId: member.guild.id,
        userId: member.id,
      });
      // Little bit of a sanity check
      expect(found).toEqual(updated);
    }
    validate({
      member,
      startingSettings,
      source,
      updated,
      updateSettingsError,
    });
  }
}
