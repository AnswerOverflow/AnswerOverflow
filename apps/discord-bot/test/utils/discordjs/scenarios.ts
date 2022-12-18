import { PermissionFlagsBits } from "discord.js";
import { mockForumChannel, mockTextChannel, mockThreadChannel } from "./channel-mock";
import { mockGuild } from "./guild-mock";
import { mockClient, mockReacord } from "./mock";
import { mockGuildMember, mockUser } from "./user-mock";

// Helper function to do a bunch of setup for a normal scenario
// Returns an object with the following properties:
// 1. Guild Owner
// 2. Guild Regular Member (default permissions)
// 3. Guild Manager (Manage Guild permissions)
// 4. Guild Admin (Administrator permissions)
// 5. Guild
// 6. Fourm Channel
// 7. Voice Channel
// 8. Text Channel
// 9. Thread (Text Channel)
// 10. Thread (Forum Channel)
// 11. User in no guilds
export async function createNormalScenario() {
  const client = mockClient();
  await client.login();
  const reacord = mockReacord();
  const guild = mockGuild(client);
  const guild_member_owner = await guild.members.fetch(guild.ownerId);
  const guild_member_default = mockGuildMember(client, undefined, guild);
  const guild_member_manage_guild = mockGuildMember(
    client,
    undefined,
    guild,
    PermissionFlagsBits.ManageGuild
  );
  const guild_member_admin = mockGuildMember(
    client,
    undefined,
    guild,
    PermissionFlagsBits.Administrator
  );
  const forum_channel = mockForumChannel(client, guild);
  const forum_thread = mockThreadChannel(client, guild, forum_channel);
  const text_channel = mockTextChannel(client, guild);
  const user_in_no_guilds = mockUser(client);
  return {
    client,
    reacord,
    guild,
    guild_member_owner,
    guild_member_default,
    guild_member_manage_guild,
    guild_member_admin,
    forum_channel,
    forum_thread,
    text_channel,
    user_in_no_guilds,
  };
}
