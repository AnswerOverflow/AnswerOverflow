import { Client, Events, Guild, GuildMember } from "discord.js";
import { emitEvent, mockGuild, mockGuildMember } from "@answeroverflow/discordjs-mock";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import {
  createDiscordAccount,
  prisma,
  User,
  _NOT_PROD_createOauthAccountEntry,
} from "@answeroverflow/db";
import { toAODiscordAccount, toDiscordAPIServer } from "~discord-bot/utils/conversions";
import { getUserServers, updateUserServersCache } from "@answeroverflow/cache";
// import { updateUserServersCache } from "@answeroverflow/cache";
let client: Client;
let guild: Guild;
let member: GuildMember;
let user: User;
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
  guild = mockGuild(client);
  member = mockGuildMember({ client, guild });
  user = await prisma.user.create({
    data: {},
  });
  await createDiscordAccount(toAODiscordAccount(member.user));
});

describe("Account Parity", () => {
  describe("Guild member add", () => {
    it("should update the cache when a user joins a server", async () => {
      const oauth = await _NOT_PROD_createOauthAccountEntry({
        discordUserId: member.user.id,
        userId: user.id,
      });
      await updateUserServersCache(oauth.access_token!, [toDiscordAPIServer(member)]);
      const userServers = await getUserServers(oauth.access_token!);
      expect(userServers).toEqual([toDiscordAPIServer(member)]);
      const member2 = mockGuildMember({ client, user: member.user });
      await emitEvent(client, Events.GuildMemberAdd, member2);

      const userServers2 = await getUserServers(oauth.access_token!);
      expect(userServers2).toHaveLength(2);
      expect(userServers2).toContainEqual(toDiscordAPIServer(member2));
      expect(userServers2).toContainEqual(toDiscordAPIServer(member));
    });
  });
  describe("Guild member remove", () => {
    it("should update the cache when a user leaves a server", async () => {
      const oauth = await _NOT_PROD_createOauthAccountEntry({
        discordUserId: member.user.id,
        userId: user.id,
      });
      await updateUserServersCache(oauth.access_token!, [toDiscordAPIServer(member)]);
      const userServers = await getUserServers(oauth.access_token!);
      expect(userServers).toEqual([toDiscordAPIServer(member)]);

      await emitEvent(client, Events.GuildMemberRemove, member);

      const userServers2 = await getUserServers(oauth.access_token!);
      expect(userServers2).toHaveLength(0);
    });
  });
});
