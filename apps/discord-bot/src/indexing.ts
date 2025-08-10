import { DiscordREST } from "dfx/DiscordREST";
import { Effect, Layer } from "effect";
import { DiscordGatewayLayer } from "./framework/discord-gateway";
import { Guilds } from "./framework/guilds";

const make = Effect.gen(function* () {
	const _api = yield* DiscordREST;
});

export const IndexingLive = Layer.scopedDiscard(make).pipe(
	Layer.provide(DiscordGatewayLayer),
	Layer.provide(Guilds.Default),
);
