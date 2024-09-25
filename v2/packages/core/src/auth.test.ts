import { getRandomId } from "@answeroverflow/utils/id";
import { createDiscordAccount } from "./discord-account";
import {
  _NOT_PROD_createOauthAccountEntry,
  Auth,
  findDiscordOauthByProviderAccountId,
} from "./auth";
import { db } from "./db";
import { mockDiscordAccount } from "../mock";
import { dbUsers } from "./schema";
import { describe, expect, it, beforeEach, mock, afterEach } from "bun:test";
describe("Auth", () => {
  it("should find a linked discord account auth by id", async () => {
    const discordUserId = getRandomId();

    const USER_ID = getRandomId();
    const USER_EMAIL = `example+${getRandomId()}@example.com`;

    await db.insert(dbUsers).values({
      id: USER_ID,
      email: USER_EMAIL,
    });
    await createDiscordAccount(
      mockDiscordAccount({
        id: discordUserId,
      })
    );
    const oauth = await _NOT_PROD_createOauthAccountEntry({
      discordUserId,
      userId: USER_ID,
    });
    const found = await findDiscordOauthByProviderAccountId(discordUserId);
    expect(found).toEqual(oauth);
  });
});

const mockDiscordApiUserResponse = {
  id: "523949187663134754",
  username: "Rhys",
  display_name: null,
  avatar: "7716e305f7de26045526d9da6eef2dab",
  avatar_decoration: null,
  discriminator: "1019",
  public_flags: 4194304,
  flags: 4194304,
  banner: "18eeedfe7ec2e50c97e138739b2d752a",
  banner_color: "#4f70b9",
  accent_color: 5206201,
  locale: "en-US",
  mfa_enabled: true,
  premium_type: 2,
  email: "example@example.com",
  verified: true,
};

const mockDiscordApiServersResponse = [
  {
    id: "531221516914917387",
    name: "Pallets Projects",
    icon: "bee945887c8b46d60db79b2015b10196",
    owner: false,
    permissions: 103926848,
    features: [
      "INVITE_SPLASH",
      "DISCOVERABLE",
      "VERIFIED",
      "COMMUNITY_EXP_LARGE_GATED",
      "COMMUNITY",
      "THREADS_ENABLED",
      "NEWS",
      "ENABLED_DISCOVERABLE_BEFORE",
      "APPLICATION_COMMAND_PERMISSIONS_V2",
      "NEW_THREAD_PERMISSIONS",
      "WELCOME_SCREEN_ENABLED",
      "PREVIEW_ENABLED",
      "MEMBER_VERIFICATION_GATE_ENABLED",
      "VANITY_URL",
    ],
    permissions_new: "556302191680",
  },
  {
    id: "538568063520342026",
    name: "GGJ",
    icon: null,
    owner: true,
    permissions: 2147483647,
    features: ["APPLICATION_COMMAND_PERMISSIONS_V2"],
    permissions_new: "4398046511103",
  },
];

function mockAxiosGet<T>(data: T) {
  // @ts-ignore
  return (fetch = mock(() => ({
    json: async () => data,
    status: 200,
  })));
}

const {
  getDiscordUser,
  getUserServers,
  zUserSchema,
  updateCachedDiscordUser,
  zDiscordApiServerArraySchema,
  removeServerFromUserCache,
  addServerToUserServerCache,
} = Auth;

describe("Discord API", () => {
  describe.skip("Discord User", () => {
    it("should miss the cache and fetch discord user from the api, then write them to the cache", async () => {
      mockAxiosGet(mockDiscordApiUserResponse);

      const notCachedUser = await getDiscordUser({
        accessToken,
      });
      expect(notCachedUser).toEqual(
        zUserSchema.parse(mockDiscordApiUserResponse)
      );

      const cachedUser = await getDiscordUser({
        accessToken,
      });
      expect(cachedUser).toEqual(zUserSchema.parse(mockDiscordApiUserResponse));
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    it("should update a cached user", async () => {
      mockAxiosGet(mockDiscordApiUserResponse);

      const notCachedUser = await getDiscordUser({
        accessToken,
      });
      expect(notCachedUser).toEqual(
        zUserSchema.parse(mockDiscordApiUserResponse)
      );

      const cachedUser = await getDiscordUser({
        accessToken,
      });
      expect(cachedUser).toEqual(zUserSchema.parse(mockDiscordApiUserResponse));
      expect(fetch).toHaveBeenCalledTimes(1);

      const updatedUser = {
        ...mockDiscordApiUserResponse,
        username: "Updated Username",
      };
      await updateCachedDiscordUser(accessToken, updatedUser);
      const updatedCachedUser = await getDiscordUser({
        accessToken,
      });
      expect(updatedCachedUser).toEqual(zUserSchema.parse(updatedUser));
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
  describe.skip("Discord Servers", () => {
    it("should miss the cache and fetch discord servers from the api, then write them to the cache", async () => {
      mockAxiosGet(mockDiscordApiServersResponse);
      const notCachedServers = await getUserServers({
        accessToken,
      });
      expect(notCachedServers).toEqual(
        zDiscordApiServerArraySchema.parse(mockDiscordApiServersResponse)
      );

      const cachedServers = await getUserServers({
        accessToken,
      });
      expect(cachedServers).toEqual(
        zDiscordApiServerArraySchema.parse(mockDiscordApiServersResponse)
      );
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    it("should manually remove a server from the users cache", async () => {
      mockAxiosGet(mockDiscordApiServersResponse);
      const notCachedServers = await getUserServers({
        accessToken,
      });
      expect(notCachedServers).toEqual(
        zDiscordApiServerArraySchema.parse(mockDiscordApiServersResponse)
      );

      const cachedServers = await getUserServers({
        accessToken,
      });
      expect(cachedServers).toHaveLength(2);
      expect(cachedServers).toEqual(
        zDiscordApiServerArraySchema.parse(mockDiscordApiServersResponse)
      );
      const idToRemove = cachedServers[0]!.id;
      await removeServerFromUserCache({
        accessToken,
        serverId: idToRemove,
      });
      const cachedServersAfterRemoval = await getUserServers({
        accessToken,
      });
      expect(cachedServersAfterRemoval).toHaveLength(1);
      expect(
        cachedServersAfterRemoval.find((s) => s.id === idToRemove)
      ).toBeUndefined();
    });
    it("should manually add a server to the users cache", async () => {
      mockAxiosGet(mockDiscordApiServersResponse);
      const notCachedServers = await getUserServers({
        accessToken,
      });
      expect(notCachedServers).toEqual(
        zDiscordApiServerArraySchema.parse(mockDiscordApiServersResponse)
      );

      const cachedServers = await getUserServers({
        accessToken,
      });
      expect(cachedServers).toHaveLength(2);
      expect(cachedServers).toEqual(
        zDiscordApiServerArraySchema.parse(mockDiscordApiServersResponse)
      );
      const idToAdd = getRandomId();
      await addServerToUserServerCache({
        accessToken,
        server: {
          id: idToAdd,
          name: "Test Server",
          icon: null,
          owner: false,
          permissions: 0,
          features: [],
        },
      });
      const cachedServersAfterRemoval = await getUserServers({
        accessToken,
      });
      expect(cachedServersAfterRemoval).toHaveLength(3);
      expect(
        cachedServersAfterRemoval.find((s) => s.id === idToAdd)
      ).toBeDefined();
    });
  });
});
