import { Client, Events } from "discord.js";
import { testOnlyAPICall } from "~discord-bot/test/helpers";
import { toAOServer } from "~discord-bot/utils/conversions";
import { clearDatabase } from "@answeroverflow/db";
import {
  type GuildMemberVariants,
  createGuildMemberVariants,
  copyClass,
  emitEvent,
  mockGuild,
  mockGuildMember,
} from "@answeroverflow/discordjs-mock";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";

let client: Client;
let members: GuildMemberVariants;
beforeEach(async () => {
  await clearDatabase();
  client = await setupAnswerOverflowBot();
  members = await createGuildMemberVariants(client);
});

describe("Read the rules consent", () => {
  it("should mark a pending user as consenting in a server with read the rules consent enabled", async () => {
    // setup
    await testOnlyAPICall((router) =>
      router.server_settings.upsertWithDeps({
        server: toAOServer(members.pending_guild_member_default.guild),
        flags: {
          read_the_rules_consent_enabled: true,
        },
      })
    );

    // act
    const full_member = copyClass(members.pending_guild_member_default, client);
    full_member.pending = false;
    await emitEvent(
      client,
      Events.GuildMemberUpdate,
      members.pending_guild_member_default,
      full_member
    );

    // assert
    const updated_settings = await testOnlyAPICall((router) =>
      router.user_server_settings.byId({
        user_id: full_member.id,
        server_id: full_member.guild.id,
      })
    );

    expect(updated_settings!.flags.can_publicly_display_messages).toBe(true);
  });
  it("should not mark a pending user as consenting in a server with read the rules consent disabled", async () => {
    // setup
    await testOnlyAPICall((router) =>
      router.server_settings.upsertWithDeps({
        server: toAOServer(members.pending_guild_member_default.guild),
        flags: {
          read_the_rules_consent_enabled: false,
        },
      })
    );

    // act
    const full_member = copyClass(members.pending_guild_member_default, client);
    full_member.pending = false;
    await emitEvent(
      client,
      Events.GuildMemberUpdate,
      members.pending_guild_member_default,
      full_member
    );

    // assert
    const updated_settings = await testOnlyAPICall((router) =>
      router.user_server_settings.byId({
        user_id: full_member.id,
        server_id: full_member.guild.id,
      })
    );
    expect(updated_settings).toBe(null);
  });
  it("should mark multiple users as consenting in a server with read the rules consent enabled", async () => {
    const server = mockGuild(client);
    const members = [
      mockGuildMember({ client, guild: server, data: { pending: true } }),
      mockGuildMember({ client, guild: server, data: { pending: true } }),
      mockGuildMember({ client, guild: server, data: { pending: true } }),
      mockGuildMember({ client, guild: server, data: { pending: true } }),
      mockGuildMember({ client, guild: server, data: { pending: true } }),
      mockGuildMember({ client, guild: server, data: { pending: true } }),
      mockGuildMember({ client, guild: server, data: { pending: true } }),
      mockGuildMember({ client, guild: server, data: { pending: true } }),
      mockGuildMember({ client, guild: server, data: { pending: true } }),
      mockGuildMember({ client, guild: server, data: { pending: true } }),
      mockGuildMember({ client, guild: server, data: { pending: true } }),
    ];
    for await (const pending_member of members) {
      // setup
      await testOnlyAPICall((router) =>
        router.server_settings.upsertWithDeps({
          server: toAOServer(pending_member.guild),
          flags: {
            read_the_rules_consent_enabled: true,
          },
        })
      );

      // act
      const full_member = copyClass(pending_member, client);
      full_member.pending = false;
      await emitEvent(client, Events.GuildMemberUpdate, pending_member, full_member);

      // assert
      const updated_settings = await testOnlyAPICall((router) =>
        router.user_server_settings.byId({
          user_id: full_member.id,
          server_id: full_member.guild.id,
        })
      );
      expect(updated_settings!.flags.can_publicly_display_messages).toBe(true);
    }
  });
});
