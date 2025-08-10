import { Chunk, Effect, Option, RateLimiter, Stream } from "effect";
import type { Discord } from "dfx";
import { Cache } from "dfx";
import { CachePrelude } from "dfx/gateway";
import { DiscordREST } from "dfx/DiscordREST";
import type { ListMyGuildsParams, MyGuildResponse } from "dfx/types";
import { Duration } from "effect";
import { DiscordGatewayLayer } from "./discord-gateway";
import { DiscordRestLayer } from "./discord-rest.ts";

class GuildsCache extends Effect.Service<GuildsCache>()("app/GuildsCache", {
	scoped: CachePrelude.guilds(
		Cache.memoryTTLDriver({
			ttl: Duration.minutes(30),
			strategy: "activity",
		}),
	),
	dependencies: [DiscordGatewayLayer],
}) {}

export class Guilds extends Effect.Service<Guilds>()("app/Guilds", {
	dependencies: [GuildsCache.Default, DiscordRestLayer],
	effect: Effect.scoped(
		Effect.gen(function* () {
			const rest = yield* DiscordREST;
			const cache = yield* GuildsCache;

			const perSecond = yield* RateLimiter.make({
				limit: 10,
				interval: "1 seconds",
			});
			const perMinute = yield* RateLimiter.make({
				limit: 500,
				interval: "1 minutes",
				algorithm: "fixed-window",
			});
			const limit = <A, E, R>(task: Effect.Effect<A, E, R>) =>
				perMinute(perSecond(task));

			const get = (guildId: Discord.Snowflake) => limit(cache.get(guildId));

			const list = (params?: ListMyGuildsParams) =>
				limit(
					Stream.runCollect(
						Stream.paginateChunkEffect(params ?? {}, (state) =>
							DiscordREST.pipe(
								Effect.flatMap((rest) => rest.listMyGuilds(state)),
								Effect.map((page) => {
									const next =
										page.length > 0
											? Option.some({
													...state,
													after: page[page.length - 1]!.id,
												})
											: Option.none<ListMyGuildsParams>();
									return [Chunk.fromIterable(page), next] as const;
								}),
							),
						),
					).pipe(Effect.map(Chunk.toReadonlyArray)),
				);

			const update = (guildId: Discord.Snowflake) =>
				limit(cache.update(guildId, () => rest.getGuild(guildId, {})));

			const del = (guildId: Discord.Snowflake) => limit(cache.delete(guildId));

			return {
				get,
				list,
				update,
				del,
			} as const;
		}),
	),
}) {}
