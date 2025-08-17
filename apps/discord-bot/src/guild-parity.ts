import { DiscordREST } from "dfx/DiscordREST";
import { DiscordGateway } from "dfx/gateway";
import { Effect, Layer } from "effect";
import {
	Database,
	DatabaseLayer,
} from "../../../packages/database/src/database";
import { DiscordGatewayLayer } from "./framework/discord-gateway";

export const upsertGuild = (guildId: string) =>
	Effect.gen(function* () {
		const rest = yield* DiscordREST;
		const database = yield* Database;
		const guild = yield* rest.getGuild(guildId);
		yield* database.servers.upsertServer({
			discordId: guild.id,
			name: guild.name ?? guild.id,
			icon: guild.icon ?? undefined,
			description: guild.description ?? undefined,
			vanityInviteCode: guild.vanity_url_code ?? undefined,
			approximateMemberCount: guild.approximate_member_count ?? 0,
			plan: "FREE",
		});
	});

export const make = Effect.gen(function* () {
	const gateway = yield* DiscordGateway;
	yield* gateway
		.handleDispatch("READY", (readyData) =>
			Effect.gen(function* () {
				const guildIds = readyData.guilds.map((g) => g.id);
				yield* Effect.forEach(guildIds, (guildId) =>
					upsertGuild(guildId).pipe(Effect.delay(1000)),
				);
			}),
		)
		.pipe(Effect.forkScoped);
}).pipe(Effect.annotateLogs({ service: "GuildParity" }));

export const GuildParityLive = Layer.scopedDiscard(make).pipe(
	Layer.provide(DiscordGatewayLayer),
	Layer.provide(DatabaseLayer),
);
