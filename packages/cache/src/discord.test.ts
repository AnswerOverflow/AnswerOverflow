import {
  addServerToUserServerCache,
  getDiscordUser,
  getUserServers,
  removeServerFromUserCache,
  zDiscordApiServerArraySchema,
  zUserSchema,
} from "./discord";

import axios from "axios";
import { getRandomId } from "@answeroverflow/utils";

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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return axios.get.mockResolvedValue({
    data,
  });
}

let accessToken: string;
beforeEach(() => {
  vi.resetAllMocks();
  vi.mock("axios");
  accessToken = getRandomId();
});

describe("Discord API", () => {
  describe("Discord User", () => {
    it("should miss the cache and fetch discord user from the api, then write them to the cache", async () => {
      mockAxiosGet(mockDiscordApiUserResponse);

      const notCachedUser = await getDiscordUser(accessToken);
      expect(notCachedUser).toEqual(zUserSchema.parse(mockDiscordApiUserResponse));

      const cachedUser = await getDiscordUser(accessToken);
      expect(cachedUser).toEqual(zUserSchema.parse(mockDiscordApiUserResponse));
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });
  describe("Discord Servers", () => {
    it("should miss the cache and fetch discord servers from the api, then write them to the cache", async () => {
      mockAxiosGet(mockDiscordApiServersResponse);
      const notCachedServers = await getUserServers(accessToken);
      expect(notCachedServers).toEqual(
        zDiscordApiServerArraySchema.parse(mockDiscordApiServersResponse)
      );

      const cachedServers = await getUserServers(accessToken);
      expect(cachedServers).toEqual(
        zDiscordApiServerArraySchema.parse(mockDiscordApiServersResponse)
      );
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
    it("should manually remove a server from the users cache", async () => {
      mockAxiosGet(mockDiscordApiServersResponse);
      const notCachedServers = await getUserServers(accessToken);
      expect(notCachedServers).toEqual(
        zDiscordApiServerArraySchema.parse(mockDiscordApiServersResponse)
      );

      const cachedServers = await getUserServers(accessToken);
      expect(cachedServers).toHaveLength(2);
      expect(cachedServers).toEqual(
        zDiscordApiServerArraySchema.parse(mockDiscordApiServersResponse)
      );
      const idToRemove = cachedServers[0]!.id;
      await removeServerFromUserCache({
        accessToken,
        serverId: idToRemove,
      });
      const cachedServersAfterRemoval = await getUserServers(accessToken);
      expect(cachedServersAfterRemoval).toHaveLength(1);
      expect(cachedServersAfterRemoval.find((s) => s.id === idToRemove)).toBeUndefined();
    });
    it("should manually add a server to the users cache", async () => {
      mockAxiosGet(mockDiscordApiServersResponse);
      const notCachedServers = await getUserServers(accessToken);
      expect(notCachedServers).toEqual(
        zDiscordApiServerArraySchema.parse(mockDiscordApiServersResponse)
      );

      const cachedServers = await getUserServers(accessToken);
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
      const cachedServersAfterRemoval = await getUserServers(accessToken);
      expect(cachedServersAfterRemoval).toHaveLength(3);
      expect(cachedServersAfterRemoval.find((s) => s.id === idToAdd)).toBeDefined();
    });
  });
});
