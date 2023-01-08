import { Client, Events, GuildMember } from "discord.js";
import { createNormalScenario } from "~discord-bot/test/utils/discordjs/scenarios";
import { copyClass, emitEvent, testOnlyAPICall } from "~discord-bot/test/utils/helpers";
import { toAOServer } from "~discord-bot/utils/conversions";

let client: Client;
let pending_member: GuildMember;
beforeEach(async () => {
  const data = await createNormalScenario();
  client = data.client;
  pending_member = data.pending_guild_member_default;
});

describe("Read the rules consent", () => {
  it("should mark a pending user as consenting in a server with read the rules consent enabled", async () => {
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
  });
  it("should not mark a pending user as consenting in a server with read the rules consent disabled", async () => {});
});
