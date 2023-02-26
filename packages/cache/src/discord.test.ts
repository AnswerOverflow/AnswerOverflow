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
  {
    id: "545388030467375121",
    name: "UE4 Winter Jam",
    icon: "c36a41c71195d0d19106a15e1b096b47",
    owner: true,
    permissions: 2147483647,
    features: ["APPLICATION_COMMAND_PERMISSIONS_V2"],
    permissions_new: "4398046511103",
  },
];

describe("Discord API", () => {
  describe("Discord Servers", () => {
    it("should miss the cache and fetch discord servers from the api, then write them to the cache", async () => {});
  });
});
