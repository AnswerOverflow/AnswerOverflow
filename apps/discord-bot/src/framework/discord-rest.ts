import { FetchHttpClient } from "@effect/platform";
import { DiscordREST, DiscordRESTMemoryLive } from "dfx";
import { Effect, Layer } from "effect";
import { DiscordConfigLayer } from "./discord-config.ts";

const DiscordLayer = DiscordRESTMemoryLive.pipe(
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(DiscordConfigLayer)
);

export class DiscordApplication extends Effect.Service<DiscordApplication>()(
  "app/DiscordApplication",
  {
    effect: DiscordREST.pipe(
      Effect.flatMap((_) => _.getMyApplication()),
      Effect.orDie
    ),
    dependencies: [DiscordLayer],
  }
) {}

export const DiscordRestLayer = Layer.merge(
  DiscordLayer,
  DiscordApplication.Default
);
