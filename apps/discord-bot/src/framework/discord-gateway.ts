import { BunSocket } from "@effect/platform-bun";
import { FetchHttpClient } from "@effect/platform";
import { DiscordIxLive } from "dfx/gateway";
import { Layer } from "effect";
import { DiscordConfigLayer } from "./discord-config.ts";
import { DiscordApplication } from "./discord-rest.ts";

const DiscordLayer = DiscordIxLive.pipe(
  Layer.provideMerge(FetchHttpClient.layer),
  Layer.provide(BunSocket.layerWebSocketConstructor),
  Layer.provide(DiscordConfigLayer)
);

export const DiscordGatewayLayer = Layer.merge(
  DiscordLayer,
  DiscordApplication.Default
);
