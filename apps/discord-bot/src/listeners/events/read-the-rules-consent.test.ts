import { Events } from "discord.js";
import { createNormalScenario } from "~discord-bot/test/utils/discordjs/scenarios";
import { copyClass, emitEvent } from "~discord-bot/test/utils/helpers";
import { toAOServer } from "~discord-bot/utils/conversions";
import { callAPI } from "~discord-bot/utils/trpc";

describe("Read the rules consent", () => {
  it("should mark a pending user as consenting", async () => {
    // setup
    const { client, pending_guild_member_default: pending_member } = await createNormalScenario();
    await callAPI({
      async ApiCall(router) {
        return router.server_settings.upsertWithDeps({
          server: toAOServer(pending_member.guild),
          flags: {
            read_the_rules_consent_enabled: true,
          },
        });
      },
    });

    // act
    const full_member = copyClass(pending_member);
    full_member.pending = false;
    await emitEvent(client, Events.GuildMemberUpdate, pending_member, full_member);

    // assert
    let can_publicly_display_messages: boolean | null = null;
    await callAPI({
      async ApiCall(router) {
        return router.user_server_settings.byId({
          user_id: full_member.id,
          server_id: full_member.guild.id,
        });
      },
      Error(error) {
        throw error;
      },
      Ok(result) {
        can_publicly_display_messages = result.flags.can_publicly_display_messages;
      },
    });

    expect(can_publicly_display_messages).toBe(true);
  });
});
