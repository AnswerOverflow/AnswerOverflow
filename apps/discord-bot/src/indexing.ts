import { Duration, Effect, Layer, Schedule } from "effect";
import { DiscordGatewayLayer } from "./framework/discord-gateway";
import { Guilds } from "./framework/guilds";
import { DiscordREST } from "dfx/DiscordREST";

const make = Effect.gen(function* () {
	const api = yield* DiscordREST;
});

export const IndexingLive = Layer.scopedDiscard(make).pipe(
	Layer.provide(DiscordGatewayLayer),
	Layer.provide(Guilds.Default),
);
